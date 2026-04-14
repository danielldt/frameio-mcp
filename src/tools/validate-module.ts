import {
  validateModule as validateModuleOnDisk,
  validateModuleFromFiles,
  type ValidationResult,
} from '../utils/validator.js';

export async function validateModule(args: {
  modulePath?: string;
  /** Remote / hosted MCP: map of relative paths (e.g. package.json, src/index.ts) to file contents */
  files?: Record<string, string>;
  moduleId?: string;
  registryContent?: string;
  strict?: boolean;
}): Promise<ValidationResult> {
  const strict = args.strict ?? false;
  const files = args.files;
  if (files && Object.keys(files).length > 0) {
    return validateModuleFromFiles({
      files,
      moduleId: args.moduleId,
      strict,
      registryContent: args.registryContent,
    });
  }
  if (args.modulePath) {
    return validateModuleOnDisk(args.modulePath, strict);
  }
  return {
    valid: false,
    errors: [
      'Provide modulePath (local repo) or files (map with at least package.json and src/index.ts) for remote validation.',
    ],
    warnings: [],
    checks: {
      structure: false,
      exports: false,
      conventions: false,
      registry: false,
    },
  };
}

export type { ValidationResult };
