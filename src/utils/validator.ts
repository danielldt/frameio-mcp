import fs from 'fs-extra';
import path from 'path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    structure: boolean;
    exports: boolean;
    conventions: boolean;
    registry: boolean;
  };
}

function normalizeRelKey(key: string): string {
  return key.replace(/\\/g, '/').replace(/^\.\//, '');
}

function getFileFromMap(files: Record<string, string>, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    const n = normalizeRelKey(c);
    if (files[n] !== undefined) return files[n];
  }
  const normalizedMap = new Map<string, string>();
  for (const [k, v] of Object.entries(files)) {
    normalizedMap.set(normalizeRelKey(k), v);
  }
  for (const c of candidates) {
    const hit = normalizedMap.get(normalizeRelKey(c));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function parsePackageName(pkgJson: string): { name: string; moduleId: string } | null {
  try {
    const j = JSON.parse(pkgJson) as { name?: string };
    if (!j.name || typeof j.name !== 'string') return null;
    const m = j.name.match(/^@frameio\/(.+)$/);
    if (!m) return { name: j.name, moduleId: '' };
    return { name: j.name, moduleId: m[1] };
  } catch {
    return null;
  }
}

function runContentChecks(
  result: ValidationResult,
  moduleId: string,
  indexContent: string,
  strict: boolean
): void {
  const camelCaseId = moduleId.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  const expectedExport = `${camelCaseId}Module`;

  const hasExport =
    indexContent.includes(`export const ${expectedExport}`) ||
    indexContent.includes(`export default`) ||
    indexContent.includes(
      `export const ${camelCaseId.charAt(0).toUpperCase() + camelCaseId.slice(1)}Module`
    );

  if (!hasExport) {
    result.errors.push(
      `Module export not found. Expected 'export const ${expectedExport}' or 'export default'`
    );
    result.valid = false;
  } else {
    result.checks.exports = true;
  }

  if (!indexContent.includes('createModule')) {
    result.errors.push('Module does not use createModule()');
    result.valid = false;
  }

  const entityKeyRegex = /defineEntity\(['"]([^'"]+)['"]\)/g;
  const matches = [...indexContent.matchAll(entityKeyRegex)];
  for (const match of matches) {
    const entityKey = match[1];
    if (!entityKey.startsWith(`${moduleId}.`)) {
      result.errors.push(`Entity key '${entityKey}' should start with '${moduleId}.'`);
      result.valid = false;
    }
    if (!/^[a-z0-9-]+\.[a-z0-9_]+$/.test(entityKey)) {
      result.errors.push(
        `Entity key '${entityKey}' does not follow format {module-id}.{entity-name}`
      );
      result.valid = false;
    }
  }

  const permissionRegex = /permission\(['"]([^'"]+)['"]/g;
  const permMatches = [...indexContent.matchAll(permissionRegex)];
  for (const match of permMatches) {
    const permId = match[1];
    if (!permId.includes('.')) {
      result.warnings.push(`Permission ID '${permId}' should follow format {entity-key}.{action}`);
    }
  }

  result.checks.conventions = result.errors.length === 0;

  if (strict) {
    if (!indexContent.includes('registerPermissions')) {
      result.warnings.push('Module does not register permissions (recommended)');
    }
    if (!indexContent.includes('registerEntities')) {
      result.warnings.push('Module does not register entities');
    }
    if (!indexContent.includes('registerNavItems') && !indexContent.includes('registerNavSection')) {
      result.warnings.push('Module does not register navigation items (recommended)');
    }
  }
}

async function resolveRegistryContent(
  explicit: string | undefined,
  result: ValidationResult,
  mode: 'path' | 'files'
): Promise<{ content: string | null; source: 'arg' | 'disk' | 'none' }> {
  if (explicit !== undefined) {
    return { content: explicit, source: 'arg' };
  }
  const registryPath = path.resolve(process.cwd(), 'modules', '.registry.ts');
  if (await fs.pathExists(registryPath)) {
    const registryContent = await fs.readFile(registryPath, 'utf-8');
    return { content: registryContent, source: 'disk' };
  }
  if (mode === 'files') {
    result.warnings.push(
      'modules/.registry.ts not on MCP host — registry check skipped. Pass registryContent (full file text) to verify registration.'
    );
  } else {
    result.warnings.push('modules/.registry.ts not found');
  }
  return { content: null, source: 'none' };
}

function applyRegistryCheck(
  result: ValidationResult,
  moduleId: string,
  registryContent: string | null,
  source: 'arg' | 'disk' | 'none'
): void {
  if (registryContent === null) {
    if (source === 'none') result.checks.registry = false;
    return;
  }
  const registryEntry = `moduleId: '${moduleId}'`;
  if (!registryContent.includes(registryEntry)) {
    result.warnings.push(
      `Module not found in modules/.registry.ts. Add: { moduleId: '${moduleId}', importPath: '@frameio/${moduleId}' }`
    );
  } else {
    result.checks.registry = true;
  }
}

/**
 * Validate a module from in-memory files (for remote MCP). Keys are paths relative to the module root * (e.g. package.json, src/index.ts). At minimum package.json and src/index.ts should be supplied.
 */
export async function validateModuleFromFiles(args: {
  files: Record<string, string>;
  moduleId?: string;
  strict?: boolean;
  /** When set, used for registry check instead of reading modules/.registry.ts from disk */
  registryContent?: string;
}): Promise<ValidationResult> {
  const { files, strict = false } = args;
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    checks: {
      structure: false,
      exports: false,
      conventions: false,
      registry: false,
    },
  };

  const pkgRaw = getFileFromMap(files, 'package.json');
  const indexRaw = getFileFromMap(files, 'src/index.ts', 'index.ts');

  if (!pkgRaw) {
    result.errors.push('package.json missing from files map (required for remote validation)');
    result.valid = false;
  }
  if (!indexRaw) {
    result.errors.push('src/index.ts missing from files map (required for remote validation)');
    result.valid = false;
  }

  let moduleId = args.moduleId?.trim() || '';
  if (pkgRaw) {
    const parsed = parsePackageName(pkgRaw);
    if (parsed && parsed.moduleId) {
      if (moduleId && moduleId !== parsed.moduleId) {
        result.warnings.push(
          `moduleId argument '${moduleId}' differs from package.json name '@frameio/${parsed.moduleId}' — using package.json`
        );
      }
      moduleId = parsed.moduleId;
    } else if (parsed && !parsed.moduleId) {
      result.errors.push(`package.json name should be '@frameio/<module-id>', found '${parsed.name}'`);
      result.valid = false;
    }
  }

  if (!moduleId) {
    result.errors.push(
      'Could not determine module id — set package.json name to @frameio/<kebab-id> or pass moduleId'
    );
    result.valid = false;
  }

  if (!pkgRaw || !indexRaw || !moduleId) {
    return result;
  }

  let pkgOk = false;
  try {
    const pkg = JSON.parse(pkgRaw) as { name?: string };
    if (pkg.name !== `@frameio/${moduleId}`) {
      result.errors.push(
        `package.json name should be '@frameio/${moduleId}', found '${pkg.name ?? ''}'`
      );
      result.valid = false;
    } else {
      pkgOk = true;
    }
  } catch (e) {
    result.errors.push(`package.json is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    result.valid = false;
  }

  const tsconfigRaw = getFileFromMap(files, 'tsconfig.json');
  if (!tsconfigRaw) {
    result.warnings.push('tsconfig.json not provided (recommended)');
  }

  result.checks.structure = result.errors.length === 0;

  if (pkgOk) {
    try {
      runContentChecks(result, moduleId, indexRaw, strict);
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.valid = false;
    }
  }

  const reg = await resolveRegistryContent(args.registryContent, result, 'files');
  applyRegistryCheck(result, moduleId, reg.content, reg.source);

  return result;
}

export async function validateModule(
  modulePath: string,
  strict: boolean = false
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    checks: {
      structure: false,
      exports: false,
      conventions: false,
      registry: false,
    },
  };

  const fullPath = path.resolve(process.cwd(), modulePath);
  const moduleId = path.basename(fullPath);

  try {
    const packageJsonPath = path.join(fullPath, 'package.json');
    const indexTsPath = path.join(fullPath, 'src', 'index.ts');
    const tsConfigPath = path.join(fullPath, 'tsconfig.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      result.errors.push('package.json not found');
      result.valid = false;
    } else {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.name !== `@frameio/${moduleId}`) {
        result.errors.push(
          `package.json name should be '@frameio/${moduleId}', found '${packageJson.name}'`
        );
        result.valid = false;
      }
    }

    if (!(await fs.pathExists(indexTsPath))) {
      result.errors.push('src/index.ts not found');
      result.valid = false;
    }

    if (!(await fs.pathExists(tsConfigPath))) {
      result.warnings.push('tsconfig.json not found (recommended)');
    }

    result.checks.structure = result.errors.length === 0;
  } catch (error) {
    result.errors.push(
      `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    result.valid = false;
  }

  try {
    const indexTsPath = path.join(fullPath, 'src', 'index.ts');
    if (await fs.pathExists(indexTsPath)) {
      const content = await fs.readFile(indexTsPath, 'utf-8');
      runContentChecks(result, moduleId, content, strict);
    }
  } catch (error) {
    result.errors.push(
      `Export validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    result.valid = false;
  }

  try {
    const reg = await resolveRegistryContent(undefined, result, 'path');
    applyRegistryCheck(result, moduleId, reg.content, reg.source);
  } catch (error) {
    result.warnings.push(
      `Registry validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}
