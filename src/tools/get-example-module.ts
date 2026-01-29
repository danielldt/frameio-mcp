import {
  loadExampleModule,
  findExamplesByPattern,
  findExamplesByFeature,
} from '../utils/example-loader.js';

export async function getExampleModule(args: {
  moduleId?: string;
  feature?: string;
  pattern?: string;
}): Promise<string> {
  const { moduleId, feature, pattern } = args;

  if (moduleId) {
    const example = await loadExampleModule(moduleId);
    if (!example) {
      return `No example found for module: ${moduleId}`;
    }

    return `# Example Module: ${moduleId}

## Features
${example.features.map((f) => `- ${f}`).join('\n')}

## Code
\`\`\`typescript
${example.content}
\`\`\`
`;
  }

  if (pattern) {
    const examples = await findExamplesByPattern(pattern);
    if (examples.length === 0) {
      return `No examples found matching pattern: ${pattern}`;
    }

    return `# Examples Matching Pattern: ${pattern}

${examples
  .map(
    (ex) => `## Module: ${ex.moduleId}

**Features:** ${ex.features.join(', ')}

\`\`\`typescript
${ex.content.substring(0, 1000)}${ex.content.length > 1000 ? '\n// ... (truncated)' : ''}
\`\`\`
`
  )
  .join('\n---\n\n')}
`;
  }

  if (feature) {
    const examples = await findExamplesByFeature(feature);
    if (examples.length === 0) {
      return `No examples found for feature: ${feature}`;
    }

    return `# Examples for Feature: ${feature}

${examples
  .map(
    (ex) => `## Module: ${ex.moduleId}

**Features:** ${ex.features.join(', ')}

\`\`\`typescript
${ex.content.substring(0, 1000)}${ex.content.length > 1000 ? '\n// ... (truncated)' : ''}
\`\`\`
`
  )
  .join('\n---\n\n')}
`;
  }

  // Return first available example
  const example = await loadExampleModule();
  if (!example) {
    return 'No example modules found in modules/ directory';
  }

  return `# Example Module: ${example.moduleId}

## Features
${example.features.map((f) => `- ${f}`).join('\n')}

## Code
\`\`\`typescript
${example.content}
\`\`\`
`;
}
