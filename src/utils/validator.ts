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

  // Check 1: Structure validation
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
    result.errors.push(`Structure validation failed: ${error instanceof Error ? error.message : String(error)}`);
    result.valid = false;
  }

  // Check 2: Export validation
  try {
    const indexTsPath = path.join(fullPath, 'src', 'index.ts');
    if (await fs.pathExists(indexTsPath)) {
      const content = await fs.readFile(indexTsPath, 'utf-8');
      
      // Check for module export
      const camelCaseId = moduleId.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const expectedExport = `${camelCaseId}Module`;
      
      const hasExport = 
        content.includes(`export const ${expectedExport}`) ||
        content.includes(`export default`) ||
        content.includes(`export const ${camelCaseId.charAt(0).toUpperCase() + camelCaseId.slice(1)}Module`);

      if (!hasExport) {
        result.errors.push(
          `Module export not found. Expected 'export const ${expectedExport}' or 'export default'`
        );
        result.valid = false;
      } else {
        result.checks.exports = true;
      }

      // Check for createModule call
      if (!content.includes('createModule')) {
        result.errors.push('Module does not use createModule()');
        result.valid = false;
      }
    }
  } catch (error) {
    result.errors.push(`Export validation failed: ${error instanceof Error ? error.message : String(error)}`);
    result.valid = false;
  }

  // Check 3: Conventions validation
  try {
    const indexTsPath = path.join(fullPath, 'src', 'index.ts');
    if (await fs.pathExists(indexTsPath)) {
      const content = await fs.readFile(indexTsPath, 'utf-8');

      // Check entity keys format
      const entityKeyRegex = /defineEntity\(['"]([^'"]+)['"]\)/g;
      const matches = [...content.matchAll(entityKeyRegex)];
      for (const match of matches) {
        const entityKey = match[1];
        if (!entityKey.startsWith(`${moduleId}.`)) {
          result.errors.push(
            `Entity key '${entityKey}' should start with '${moduleId}.'`
          );
          result.valid = false;
        }
        if (!/^[a-z0-9-]+\.[a-z0-9_]+$/.test(entityKey)) {
          result.errors.push(
            `Entity key '${entityKey}' does not follow format {module-id}.{entity-name}`
          );
          result.valid = false;
        }
      }

      // Check permission IDs format
      const permissionRegex = /permission\(['"]([^'"]+)['"]/g;
      const permMatches = [...content.matchAll(permissionRegex)];
      for (const match of permMatches) {
        const permId = match[1];
        if (!permId.includes('.')) {
          result.warnings.push(`Permission ID '${permId}' should follow format {entity-key}.{action}`);
        }
      }

      result.checks.conventions = result.errors.length === 0;
    }
  } catch (error) {
    result.errors.push(`Conventions validation failed: ${error instanceof Error ? error.message : String(error)}`);
    result.valid = false;
  }

  // Check 4: Registry validation
  try {
    const registryPath = path.resolve(process.cwd(), 'modules', '.registry.ts');
    if (await fs.pathExists(registryPath)) {
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      const registryEntry = `moduleId: '${moduleId}'`;
      
      if (!registryContent.includes(registryEntry)) {
        result.warnings.push(
          `Module not found in modules/.registry.ts. Add: { moduleId: '${moduleId}', importPath: '@frameio/${moduleId}' }`
        );
      } else {
        result.checks.registry = true;
      }
    } else {
      result.warnings.push('modules/.registry.ts not found');
    }
  } catch (error) {
    result.warnings.push(`Registry validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Strict mode checks
  if (strict) {
    const indexTsPath = path.join(fullPath, 'src', 'index.ts');
    if (await fs.pathExists(indexTsPath)) {
      const content = await fs.readFile(indexTsPath, 'utf-8');

      // Check for permissions
      if (!content.includes('registerPermissions')) {
        result.warnings.push('Module does not register permissions (recommended)');
      }

      // Check for entities
      if (!content.includes('registerEntities')) {
        result.warnings.push('Module does not register entities');
      }

      // Check for navigation
      if (!content.includes('registerNavItems') && !content.includes('registerNavSection')) {
        result.warnings.push('Module does not register navigation items (recommended)');
      }
    }
  }

  return result;
}
