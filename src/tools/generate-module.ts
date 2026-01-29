import {
  generatePackageJson,
  generateTsConfig,
  generateModuleIndex,
  generateRegistryEntry,
} from '../utils/code-generator.js';

export async function generateModule(args: {
  moduleId: string;
  displayName: string;
  description: string;
  entities?: any[];
  includeNavigation?: boolean;
  includeCommands?: boolean;
}): Promise<string> {
  const {
    moduleId,
    displayName,
    description,
    entities = [],
    includeNavigation = true,
    includeCommands = true,
  } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  const packageJson = generatePackageJson(moduleId);
  const tsConfig = generateTsConfig();
  const indexTs = generateModuleIndex(
    moduleId,
    displayName,
    description,
    entities,
    includeNavigation,
    includeCommands
  );
  const registryEntry = generateRegistryEntry(moduleId);

  return `# Module Generation Results

## Files Generated

### 1. package.json
\`\`\`json
${packageJson}
\`\`\`

### 2. tsconfig.json
\`\`\`json
${tsConfig}
\`\`\`

### 3. src/index.ts
\`\`\`typescript
${indexTs}
\`\`\`

### 4. Registry Entry
Add this to \`modules/.registry.ts\`:
\`\`\`typescript
${registryEntry}
\`\`\`

## Next Steps

1. Create the module directory: \`modules/${moduleId}/\`
2. Create the \`src/\` subdirectory
3. Copy the generated files to their respective locations
4. Add the registry entry to \`modules/.registry.ts\`
5. Run \`npm install\` in the module directory
6. Run \`npm run build\` to compile the module
`;
}
