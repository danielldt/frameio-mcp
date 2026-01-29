import { validateModule as validateModuleStructure, type ValidationResult } from '../utils/validator.js';

export async function validateModule(args: {
  modulePath: string;
  strict?: boolean;
}): Promise<ValidationResult> {
  const { modulePath, strict = false } = args;
  return await validateModuleStructure(modulePath, strict);
}

export type { ValidationResult };
