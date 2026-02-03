import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface HookParameter {
  name: string;
  type: string;
  required?: boolean;
}

interface GenerateHookArgs {
  moduleId: string;
  hookName: string;
  description: string;
  returnType: string;
  parameters?: HookParameter[];
  usesSDKHooks?: string[];
}

export async function generateHook(args: GenerateHookArgs): Promise<string> {
  const {
    moduleId,
    hookName,
    description,
    returnType,
    parameters = [],
    usesSDKHooks = [],
  } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  // Validate hook name starts with 'use'
  if (!hookName.startsWith('use')) {
    throw new Error('Hook name must start with "use" (e.g., useOrderStatistics)');
  }

  const camelCaseModuleId = toCamelCase(moduleId);

  // Generate SDK hook imports
  const sdkHookImports = usesSDKHooks.length > 0
    ? `import { ${usesSDKHooks.join(', ')} } from '@frameio/sdk/react';`
    : '';

  // Generate parameters string
  const paramsSignature = parameters
    .map((p) => `${p.name}${p.required === false ? '?' : ''}: ${p.type}`)
    .join(', ');

  // Generate return type interface
  const returnTypeInterface = generateReturnTypeInterface(hookName, returnType);

  // Generate hook body based on SDK hooks used
  const hookBody = generateHookBody(hookName, parameters, usesSDKHooks, returnType);

  // Generate the complete hook code
  const hookCode = `${sdkHookImports}
import { useState, useEffect, useCallback, useMemo } from 'react';

${returnTypeInterface}

/**
 * ${description}
 * 
 * @example
 * \`\`\`tsx
 * function MyComponent() {
 *   const { ${getReturnProperties(returnType)} } = ${hookName}(${parameters.map(p => p.name).join(', ')});
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * \`\`\`
 */
export function ${hookName}(${paramsSignature}): ${hookName}Return {
${hookBody}
}`;

  // Generate index export
  const indexExport = `export { ${hookName} } from './${hookName}.js';`;

  return `# React Hook Generated

## Hook File

Create \`modules/${moduleId}/src/hooks/${hookName}.ts\`:

\`\`\`typescript
${hookCode}
\`\`\`

## Export from hooks/index.ts

Update \`modules/${moduleId}/src/hooks/index.ts\`:

\`\`\`typescript
${indexExport}
\`\`\`

## Hook Summary

| Property | Value |
|----------|-------|
| Name | \`${hookName}\` |
| Module | \`${moduleId}\` |
| Parameters | ${parameters.length > 0 ? parameters.map(p => `\`${p.name}: ${p.type}\``).join(', ') : 'None'} |
| SDK Hooks | ${usesSDKHooks.length > 0 ? usesSDKHooks.map(h => `\`${h}\``).join(', ') : 'None'} |

## Usage Example

\`\`\`tsx
import { ${hookName} } from '@frameio/${moduleId}/hooks';

function MyComponent() {
  const { data, isLoading, error, refetch } = ${hookName}(${parameters.map(p => {
    switch (p.type) {
      case 'string': return "'example'";
      case 'number': return '123';
      case 'boolean': return 'true';
      default: return '{}';
    }
  }).join(', ')});

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
\`\`\`

## Best Practices

1. **Error Handling:** Always handle loading and error states in your components
2. **Memoization:** Use \`useMemo\` and \`useCallback\` for expensive computations
3. **Dependencies:** Be careful with hook dependency arrays to avoid infinite loops
4. **TypeScript:** Use proper types for better IDE support and type safety
`;
}

function generateReturnTypeInterface(hookName: string, returnType: string): string {
  // Parse the return type to generate interface
  if (returnType.includes('{')) {
    // Already an object type
    return `type ${hookName}Return = ${returnType};`;
  }

  // Default return type structure
  return `interface ${hookName}Return {
  data: ${returnType} | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}`;
}

function generateHookBody(
  hookName: string,
  parameters: HookParameter[],
  usesSDKHooks: string[],
  returnType: string
): string {
  const lines: string[] = [];

  // State declarations
  lines.push('  const [data, setData] = useState<' + returnType + ' | null>(null);');
  lines.push('  const [isLoading, setIsLoading] = useState(true);');
  lines.push('  const [error, setError] = useState<Error | null>(null);');
  lines.push('');

  // If using SDK hooks
  if (usesSDKHooks.includes('usePlatformData')) {
    lines.push('  // Fetch data using SDK');
    lines.push('  const {');
    lines.push('    data: platformData,');
    lines.push('    isLoading: platformLoading,');
    lines.push('    error: platformError,');
    lines.push('    refetch: platformRefetch,');
    lines.push('  } = usePlatformData(/* entity key */, {');
    lines.push('    // Add filters, sort, pagination as needed');
    lines.push('  });');
    lines.push('');
    lines.push('  // Transform platform data to hook return type');
    lines.push('  useEffect(() => {');
    lines.push('    if (platformData) {');
    lines.push('      // Transform data as needed');
    lines.push('      setData(platformData as unknown as ' + returnType + ');');
    lines.push('    }');
    lines.push('    setIsLoading(platformLoading);');
    lines.push('    setError(platformError as Error | null);');
    lines.push('  }, [platformData, platformLoading, platformError]);');
    lines.push('');
    lines.push('  const refetch = useCallback(() => {');
    lines.push('    platformRefetch();');
    lines.push('  }, [platformRefetch]);');
  } else if (usesSDKHooks.includes('useApiClient')) {
    lines.push('  const apiClient = useApiClient();');
    lines.push('');
    lines.push('  const fetchData = useCallback(async () => {');
    lines.push('    setIsLoading(true);');
    lines.push('    setError(null);');
    lines.push('    try {');
    lines.push('      const response = await apiClient.get(/* endpoint */);');
    lines.push('      setData(response as ' + returnType + ');');
    lines.push('    } catch (err) {');
    lines.push('      setError(err instanceof Error ? err : new Error(String(err)));');
    lines.push('    } finally {');
    lines.push('      setIsLoading(false);');
    lines.push('    }');
    lines.push('  }, [apiClient]);');
    lines.push('');
    lines.push('  useEffect(() => {');
    lines.push('    fetchData();');
    lines.push('  }, [fetchData]);');
    lines.push('');
    lines.push('  const refetch = useCallback(() => {');
    lines.push('    fetchData();');
    lines.push('  }, [fetchData]);');
  } else {
    // Generic implementation
    lines.push('  const fetchData = useCallback(async () => {');
    lines.push('    setIsLoading(true);');
    lines.push('    setError(null);');
    lines.push('    try {');
    lines.push('      // TODO: Implement data fetching logic');
    lines.push('      const result = {} as ' + returnType + ';');
    lines.push('      setData(result);');
    lines.push('    } catch (err) {');
    lines.push('      setError(err instanceof Error ? err : new Error(String(err)));');
    lines.push('    } finally {');
    lines.push('      setIsLoading(false);');
    lines.push('    }');
    lines.push('  }, [' + parameters.map(p => p.name).join(', ') + ']);');
    lines.push('');
    lines.push('  useEffect(() => {');
    lines.push('    fetchData();');
    lines.push('  }, [fetchData]);');
    lines.push('');
    lines.push('  const refetch = useCallback(() => {');
    lines.push('    fetchData();');
    lines.push('  }, [fetchData]);');
  }

  lines.push('');
  lines.push('  return {');
  lines.push('    data,');
  lines.push('    isLoading,');
  lines.push('    error,');
  lines.push('    refetch,');
  lines.push('  };');

  return lines.join('\n');
}

function getReturnProperties(returnType: string): string {
  // Return common properties for display
  return 'data, isLoading, error, refetch';
}
