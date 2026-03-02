import fs from 'fs-extra';
import path from 'path';

interface DependencyIssue {
  type: 'mismatch' | 'missing' | 'outdated' | 'duplicate' | 'peer';
  severity: 'error' | 'warning' | 'info';
  package: string;
  message: string;
  currentVersion?: string;
  expectedVersion?: string;
  location?: string;
}

interface CheckDependenciesArgs {
  modulePath: string;
  checkPeerDeps?: boolean;
  checkOutdated?: boolean;
}

export async function checkDependencies(args: CheckDependenciesArgs): Promise<string> {
  const { modulePath, checkPeerDeps = true, checkOutdated = false } = args;

  const fullPath = path.resolve(process.cwd(), modulePath);
  const moduleId = path.basename(fullPath);

  const issues: DependencyIssue[] = [];

  // Check if module exists
  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Module directory not found: ${modulePath}`);
  }

  // Read module package.json
  const packageJsonPath = path.join(fullPath, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    issues.push({
      type: 'missing',
      severity: 'error',
      package: 'package.json',
      message: 'Module is missing package.json',
      location: modulePath,
    });
    return formatIssues(moduleId, issues);
  }

  const packageJson = await fs.readJson(packageJsonPath) as Record<string, unknown>;
  const dependencies = (packageJson.dependencies || {}) as Record<string, string>;
  const devDependencies = (packageJson.devDependencies || {}) as Record<string, string>;
  const peerDependencies = (packageJson.peerDependencies || {}) as Record<string, string>;

  // Read root package.json for comparison
  const rootPackageJsonPath = path.join(process.cwd(), 'package.json');
  let rootPackageJson: Record<string, unknown> = {};
  if (await fs.pathExists(rootPackageJsonPath)) {
    rootPackageJson = await fs.readJson(rootPackageJsonPath);
  }

  // Read SDK and shared package.json for framework dependencies
  const sdkPackageJsonPath = path.join(process.cwd(), 'platform', 'sdk', 'package.json');
  const sharedPackageJsonPath = path.join(process.cwd(), 'platform', 'shared', 'package.json');
  
  let sdkPeerDeps: Record<string, string> = {};
  if (await fs.pathExists(sdkPackageJsonPath)) {
    const sdkPackageJson = await fs.readJson(sdkPackageJsonPath) as Record<string, unknown>;
    sdkPeerDeps = (sdkPackageJson.peerDependencies || {}) as Record<string, string>;
  }

  // Check required framework dependencies
  const requiredDeps: Record<string, string> = {
    '@frameio/sdk': '*',
    '@frameio/shared': '*',
  };

  for (const [dep, version] of Object.entries(requiredDeps)) {
    if (!dependencies[dep]) {
      issues.push({
        type: 'missing',
        severity: 'error',
        package: dep,
        message: `Missing required dependency: ${dep}`,
        expectedVersion: version,
        location: 'dependencies',
      });
    }
  }

  // Check for version mismatches with root
  const rootDependencies = (rootPackageJson.dependencies || {}) as Record<string, string>;
  const rootDevDependencies = (rootPackageJson.devDependencies || {}) as Record<string, string>;

  for (const [dep, version] of Object.entries(dependencies)) {
    const rootVersion = rootDependencies[dep] || rootDevDependencies[dep];
    if (rootVersion && version !== rootVersion && version !== '*' && !version.startsWith('workspace:')) {
      issues.push({
        type: 'mismatch',
        severity: 'warning',
        package: dep,
        message: `Version mismatch with root: module has ${version}, root has ${rootVersion}`,
        currentVersion: version,
        expectedVersion: rootVersion,
        location: 'dependencies',
      });
    }
  }

  // Check peer dependencies
  if (checkPeerDeps) {
    for (const [dep, version] of Object.entries(sdkPeerDeps)) {
      const hasDep = dependencies[dep] || devDependencies[dep] || peerDependencies[dep];
      if (!hasDep) {
        issues.push({
          type: 'peer',
          severity: 'warning',
          package: dep,
          message: `Missing peer dependency from SDK: ${dep}@${version}`,
          expectedVersion: version,
          location: 'peerDependencies',
        });
      }
    }
  }

  // Check for duplicates in dependencies and devDependencies
  for (const dep of Object.keys(dependencies)) {
    if (devDependencies[dep]) {
      issues.push({
        type: 'duplicate',
        severity: 'warning',
        package: dep,
        message: `${dep} is listed in both dependencies and devDependencies`,
        location: 'both',
      });
    }
  }

  // Check for common problematic patterns
  checkProblematicPatterns(dependencies, devDependencies, issues);

  // Sort issues by severity
  issues.sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return formatIssues(moduleId, issues);
}

function checkProblematicPatterns(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
  issues: DependencyIssue[]
): void {
  // Check for React in dependencies (should be peer)
  if (dependencies['react']) {
    issues.push({
      type: 'peer',
      severity: 'warning',
      package: 'react',
      message: 'React should be in peerDependencies, not dependencies',
      currentVersion: dependencies['react'],
      location: 'dependencies',
    });
  }

  // Check for React DOM in dependencies
  if (dependencies['react-dom']) {
    issues.push({
      type: 'peer',
      severity: 'warning',
      package: 'react-dom',
      message: 'react-dom should be in peerDependencies, not dependencies',
      currentVersion: dependencies['react-dom'],
      location: 'dependencies',
    });
  }

  // Check for TypeScript version mismatch
  const allDeps = { ...dependencies, ...devDependencies };
  if (allDeps['typescript'] && !allDeps['typescript'].startsWith('^5')) {
    issues.push({
      type: 'outdated',
      severity: 'info',
      package: 'typescript',
      message: 'Consider upgrading TypeScript to v5.x',
      currentVersion: allDeps['typescript'],
      location: 'devDependencies',
    });
  }

  // Check for bundled SDK (should use workspace)
  if (dependencies['@frameio/sdk'] && !dependencies['@frameio/sdk'].startsWith('*') && !dependencies['@frameio/sdk'].startsWith('workspace:')) {
    issues.push({
      type: 'mismatch',
      severity: 'warning',
      package: '@frameio/sdk',
      message: '@frameio/sdk should use "*" or "workspace:*" for monorepo compatibility',
      currentVersion: dependencies['@frameio/sdk'],
      expectedVersion: '*',
      location: 'dependencies',
    });
  }
}

function formatIssues(moduleId: string, issues: DependencyIssue[]): string {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  const status = errorCount > 0 ? '❌ Issues Found' : warningCount > 0 ? '⚠️ Warnings' : '✅ All Good';

  let output = `# Dependency Check: ${moduleId}

## Summary

${status}

- **Errors:** ${errorCount}
- **Warnings:** ${warningCount}
- **Info:** ${infoCount}

`;

  if (issues.length === 0) {
    output += `No dependency issues found! 🎉\n`;
    return output;
  }

  // Group by severity
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  if (errors.length > 0) {
    output += `## ❌ Errors

${errors.map((i) => `- **${i.package}** (${i.type}): ${i.message}${i.expectedVersion ? `\n  - Expected: \`${i.expectedVersion}\`` : ''}${i.currentVersion ? `\n  - Current: \`${i.currentVersion}\`` : ''}`).join('\n\n')}

`;
  }

  if (warnings.length > 0) {
    output += `## ⚠️ Warnings

${warnings.map((i) => `- **${i.package}** (${i.type}): ${i.message}${i.expectedVersion ? `\n  - Expected: \`${i.expectedVersion}\`` : ''}${i.currentVersion ? `\n  - Current: \`${i.currentVersion}\`` : ''}`).join('\n\n')}

`;
  }

  if (infos.length > 0) {
    output += `## ℹ️ Info

${infos.map((i) => `- **${i.package}**: ${i.message}`).join('\n')}

`;
  }

  output += `## Recommendations

1. Run \`npm install\` in the module directory to ensure dependencies are installed
2. Use \`*\` or \`workspace:*\` for internal @frameio/* packages
3. Keep React/React-DOM in peerDependencies for modules
4. Align versions with root package.json when possible

## Fix Commands

\`\`\`bash
# Reinstall dependencies
cd modules/${moduleId} && npm install

# Update specific package
npm install <package>@latest -w @frameio/${moduleId}

# Fix peer dependencies
npm install --legacy-peer-deps -w @frameio/${moduleId}
\`\`\`
`;

  return output;
}
