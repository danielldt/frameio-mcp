import fs from 'fs-extra';
import path from 'path';
import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface Fix {
  type: string;
  description: string;
  applied: boolean;
  before?: string;
  after?: string;
}

interface FixModuleArgs {
  modulePath: string;
  fixes?: string[];
  dryRun?: boolean;
}

export async function fixModule(args: FixModuleArgs): Promise<string> {
  const { modulePath, fixes = [], dryRun = true } = args;

  const fullPath = path.resolve(process.cwd(), modulePath);
  const moduleId = path.basename(fullPath);

  // Check if module exists
  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Module directory not found: ${modulePath}`);
  }

  const appliedFixes: Fix[] = [];

  // Define available fixes
  const availableFixes: Record<string, () => Promise<Fix | null>> = {
    'export-name': () => fixExportName(fullPath, moduleId, dryRun),
    'package-name': () => fixPackageName(fullPath, moduleId, dryRun),
    'entity-keys': () => fixEntityKeys(fullPath, moduleId, dryRun),
    'permission-keys': () => fixPermissionKeys(fullPath, moduleId, dryRun),
    'imports': () => fixImports(fullPath, dryRun),
    'tsconfig': () => fixTsConfig(fullPath, dryRun),
    'pages-export': () => fixPagesExport(fullPath, dryRun),
  };

  // Determine which fixes to apply
  const fixesToRun = fixes.length > 0 
    ? fixes.filter((f) => f in availableFixes)
    : Object.keys(availableFixes);

  // Apply fixes
  for (const fixName of fixesToRun) {
    try {
      const fix = await availableFixes[fixName]();
      if (fix) {
        appliedFixes.push(fix);
      }
    } catch (error) {
      appliedFixes.push({
        type: fixName,
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
        applied: false,
      });
    }
  }

  const successCount = appliedFixes.filter((f) => f.applied).length;
  const failCount = appliedFixes.filter((f) => !f.applied && f.description.startsWith('Error')).length;
  const skippedCount = appliedFixes.filter((f) => !f.applied && !f.description.startsWith('Error')).length;

  return `# Module Fix Results

## Summary

- **Module:** ${moduleId}
- **Path:** ${modulePath}
- **Mode:** ${dryRun ? '🔍 Dry Run (no changes made)' : '✅ Applied'}
- **Fixes Applied:** ${successCount}
- **Fixes Skipped:** ${skippedCount}
- **Errors:** ${failCount}

## Fixes

${appliedFixes.map((fix) => `
### ${fix.applied ? '✅' : '⏭️'} ${fix.type}

**${fix.description}**
${fix.before ? `
Before:
\`\`\`
${fix.before}
\`\`\`
` : ''}
${fix.after ? `
After:
\`\`\`
${fix.after}
\`\`\`
` : ''}
`).join('\n')}

## Available Fixes

| Fix | Description |
|-----|-------------|
| \`export-name\` | Correct module export naming convention |
| \`package-name\` | Fix package.json name to @frameio/{moduleId} |
| \`entity-keys\` | Prefix entity keys with module ID |
| \`permission-keys\` | Fix permission key format |
| \`imports\` | Add missing SDK imports |
| \`tsconfig\` | Create or fix tsconfig.json |
| \`pages-export\` | Create or fix src/pages/index.ts |

## To Apply Fixes

Run again with \`dryRun: false\`:

\`\`\`json
{
  "modulePath": "${modulePath}",
  "dryRun": false
}
\`\`\`

Or apply specific fixes:

\`\`\`json
{
  "modulePath": "${modulePath}",
  "fixes": ["export-name", "package-name"],
  "dryRun": false
}
\`\`\`
`;
}

async function fixExportName(fullPath: string, moduleId: string, dryRun: boolean): Promise<Fix | null> {
  const indexPath = path.join(fullPath, 'src', 'index.ts');
  
  if (!(await fs.pathExists(indexPath))) {
    return {
      type: 'export-name',
      description: 'src/index.ts not found',
      applied: false,
    };
  }

  let content = await fs.readFile(indexPath, 'utf-8');
  const camelCaseId = toCamelCase(moduleId);
  const expectedExport = `${camelCaseId}Module`;

  // Check if correct export exists
  if (content.includes(`export const ${expectedExport}`)) {
    return {
      type: 'export-name',
      description: 'Export name is already correct',
      applied: false,
    };
  }

  // Find existing export
  const exportMatch = content.match(/export const (\w+Module)\s*=/);
  if (exportMatch && exportMatch[1] !== expectedExport) {
    const oldExport = exportMatch[1];
    const newContent = content.replace(
      new RegExp(`export const ${oldExport}`, 'g'),
      `export const ${expectedExport}`
    );

    if (!dryRun) {
      await fs.writeFile(indexPath, newContent, 'utf-8');
    }

    return {
      type: 'export-name',
      description: `Renamed export from ${oldExport} to ${expectedExport}`,
      applied: true,
      before: `export const ${oldExport}`,
      after: `export const ${expectedExport}`,
    };
  }

  return {
    type: 'export-name',
    description: 'No module export found to fix',
    applied: false,
  };
}

async function fixPackageName(fullPath: string, moduleId: string, dryRun: boolean): Promise<Fix | null> {
  const packageJsonPath = path.join(fullPath, 'package.json');
  
  if (!(await fs.pathExists(packageJsonPath))) {
    return {
      type: 'package-name',
      description: 'package.json not found',
      applied: false,
    };
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const expectedName = `@frameio/${moduleId}`;

  if (packageJson.name === expectedName) {
    return {
      type: 'package-name',
      description: 'Package name is already correct',
      applied: false,
    };
  }

  const oldName = packageJson.name;
  packageJson.name = expectedName;

  if (!dryRun) {
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  return {
    type: 'package-name',
    description: `Changed package name from ${oldName} to ${expectedName}`,
    applied: true,
    before: `"name": "${oldName}"`,
    after: `"name": "${expectedName}"`,
  };
}

async function fixEntityKeys(fullPath: string, moduleId: string, dryRun: boolean): Promise<Fix | null> {
  const indexPath = path.join(fullPath, 'src', 'index.ts');
  
  if (!(await fs.pathExists(indexPath))) {
    return {
      type: 'entity-keys',
      description: 'src/index.ts not found',
      applied: false,
    };
  }

  let content = await fs.readFile(indexPath, 'utf-8');
  let modified = false;
  const changes: string[] = [];

  // Find entity definitions that don't start with moduleId
  const entityMatches = content.matchAll(/defineEntity\(['"]([^'"]+)['"]\)/g);
  for (const match of entityMatches) {
    const entityKey = match[1];
    if (!entityKey.startsWith(moduleId + '.')) {
      // Check if it looks like just the entity name without module prefix
      if (!entityKey.includes('.')) {
        const newKey = `${moduleId}.${entityKey}`;
        content = content.replace(
          `defineEntity('${entityKey}')`,
          `defineEntity('${newKey}')`
        );
        content = content.replace(
          `defineEntity("${entityKey}")`,
          `defineEntity("${newKey}")`
        );
        changes.push(`${entityKey} → ${newKey}`);
        modified = true;
      }
    }
  }

  if (!modified) {
    return {
      type: 'entity-keys',
      description: 'All entity keys are correctly prefixed',
      applied: false,
    };
  }

  if (!dryRun) {
    await fs.writeFile(indexPath, content, 'utf-8');
  }

  return {
    type: 'entity-keys',
    description: `Fixed entity key prefixes: ${changes.join(', ')}`,
    applied: true,
    before: changes.map((c) => c.split(' → ')[0]).join(', '),
    after: changes.map((c) => c.split(' → ')[1]).join(', '),
  };
}

async function fixPermissionKeys(fullPath: string, moduleId: string, dryRun: boolean): Promise<Fix | null> {
  const indexPath = path.join(fullPath, 'src', 'index.ts');
  
  if (!(await fs.pathExists(indexPath))) {
    return {
      type: 'permission-keys',
      description: 'src/index.ts not found',
      applied: false,
    };
  }

  let content = await fs.readFile(indexPath, 'utf-8');
  let modified = false;
  const changes: string[] = [];

  // Find permission definitions that don't follow convention
  const permissionMatches = content.matchAll(/permission\(['"]([^'"]+)['"]/g);
  for (const match of permissionMatches) {
    const permKey = match[1];
    if (!permKey.startsWith(moduleId + '.') && !permKey.includes('.')) {
      const newKey = `${moduleId}.${permKey}`;
      content = content.replace(
        `permission('${permKey}'`,
        `permission('${newKey}'`
      );
      content = content.replace(
        `permission("${permKey}"`,
        `permission("${newKey}"`
      );
      changes.push(`${permKey} → ${newKey}`);
      modified = true;
    }
  }

  if (!modified) {
    return {
      type: 'permission-keys',
      description: 'All permission keys are correctly formatted',
      applied: false,
    };
  }

  if (!dryRun) {
    await fs.writeFile(indexPath, content, 'utf-8');
  }

  return {
    type: 'permission-keys',
    description: `Fixed permission key prefixes: ${changes.join(', ')}`,
    applied: true,
    before: changes.map((c) => c.split(' → ')[0]).join(', '),
    after: changes.map((c) => c.split(' → ')[1]).join(', '),
  };
}

async function fixImports(fullPath: string, dryRun: boolean): Promise<Fix | null> {
  const indexPath = path.join(fullPath, 'src', 'index.ts');
  
  if (!(await fs.pathExists(indexPath))) {
    return {
      type: 'imports',
      description: 'src/index.ts not found',
      applied: false,
    };
  }

  let content = await fs.readFile(indexPath, 'utf-8');
  const usedFunctions = new Set<string>();
  let modified = false;

  // Detect used SDK functions
  const functionPatterns = [
    'createModule', 'defineEntity', 'defineWorkflow', 'definePage',
    'permission', 'navItem', 'navSection', 'command',
    'statCard', 'quickLink', 'widget',
    'countQuery', 'sumQuery', 'avgQuery', 'filterAction', 'navigateAction',
  ];

  for (const func of functionPatterns) {
    if (content.includes(`${func}(`)) {
      usedFunctions.add(func);
    }
  }

  // Check if import from @frameio/sdk exists
  const importMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]@frameio\/sdk['"]/);
  
  if (!importMatch) {
    // No import found, add one
    if (usedFunctions.size > 0) {
      const imports = Array.from(usedFunctions).sort().join(', ');
      const importStatement = `import { ${imports} } from '@frameio/sdk';\n`;
      content = importStatement + content;
      modified = true;

      if (!dryRun) {
        await fs.writeFile(indexPath, content, 'utf-8');
      }

      return {
        type: 'imports',
        description: `Added SDK import for: ${imports}`,
        applied: true,
        after: importStatement.trim(),
      };
    }
  } else {
    // Check if all used functions are imported
    const currentImports = importMatch[1].split(',').map((s) => s.trim());
    const missingImports = Array.from(usedFunctions).filter(
      (f) => !currentImports.includes(f)
    );

    if (missingImports.length > 0) {
      const newImports = [...currentImports, ...missingImports].sort().join(', ');
      const newImportStatement = `import { ${newImports} } from '@frameio/sdk'`;
      content = content.replace(importMatch[0], newImportStatement);
      modified = true;

      if (!dryRun) {
        await fs.writeFile(indexPath, content, 'utf-8');
      }

      return {
        type: 'imports',
        description: `Added missing imports: ${missingImports.join(', ')}`,
        applied: true,
        before: importMatch[0],
        after: newImportStatement,
      };
    }
  }

  return {
    type: 'imports',
    description: 'All imports are correct',
    applied: false,
  };
}

async function fixTsConfig(fullPath: string, dryRun: boolean): Promise<Fix | null> {
  const tsconfigPath = path.join(fullPath, 'tsconfig.json');
  
  if (await fs.pathExists(tsconfigPath)) {
    return {
      type: 'tsconfig',
      description: 'tsconfig.json already exists',
      applied: false,
    };
  }

  const tsconfig = {
    extends: '../../../tsconfig.base.json',
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  if (!dryRun) {
    await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
  }

  return {
    type: 'tsconfig',
    description: 'Created tsconfig.json',
    applied: true,
    after: JSON.stringify(tsconfig, null, 2),
  };
}

async function fixPagesExport(fullPath: string, dryRun: boolean): Promise<Fix | null> {
  const pagesDir = path.join(fullPath, 'src', 'pages');
  const pagesIndex = path.join(pagesDir, 'index.ts');

  if (!(await fs.pathExists(pagesDir))) {
    return {
      type: 'pages-export',
      description: 'No pages directory found',
      applied: false,
    };
  }

  // Get all .tsx files in pages directory
  const files = await fs.readdir(pagesDir);
  const pageFiles = files.filter(
    (f) => f.endsWith('.tsx') && f !== 'index.tsx'
  );

  if (pageFiles.length === 0) {
    return {
      type: 'pages-export',
      description: 'No page files found to export',
      applied: false,
    };
  }

  // Generate exports
  const exports = pageFiles
    .map((f) => {
      const componentName = f.replace('.tsx', '');
      return `export { ${componentName} } from './${componentName}.js';`;
    })
    .join('\n');

  if (await fs.pathExists(pagesIndex)) {
    const currentContent = await fs.readFile(pagesIndex, 'utf-8');
    if (currentContent.trim() === exports.trim()) {
      return {
        type: 'pages-export',
        description: 'pages/index.ts already up to date',
        applied: false,
      };
    }
  }

  if (!dryRun) {
    await fs.writeFile(pagesIndex, exports + '\n', 'utf-8');
  }

  return {
    type: 'pages-export',
    description: `Created/updated pages/index.ts with ${pageFiles.length} export(s)`,
    applied: true,
    after: exports,
  };
}
