import {
  loadExampleModule,
  findExamplesByPattern,
  findExamplesByFeature,
} from '../utils/example-loader.js';
import {
  getBundledExample,
  findBundledByPattern,
  findBundledByFeature,
  listBundledExamples,
} from '../utils/bundled-examples.js';

function formatExample(moduleId: string, content: string, features: string[]): string {
  return `# Example Module: ${moduleId}

## Features
${features.map((f) => `- ${f}`).join('\n')}

## Code
\`\`\`typescript
${content}
\`\`\`
`;
}

function formatBundledFallbackNote(): string {
  const ids = listBundledExamples()
    .map((e) => e.moduleId)
    .join(', ');
  return `\n\n*(Using bundled examples from the MCP server — your repo's modules/ is not on this host. Bundled ids: ${ids})*\n`;
}

export async function getExampleModule(args: {
  moduleId?: string;
  feature?: string;
  pattern?: string;
}): Promise<string> {
  const { moduleId, feature, pattern } = args;

  if (moduleId) {
    const example = await loadExampleModule(moduleId);
    if (example) {
      return formatExample(example.moduleId, example.content, example.features);
    }
    const bundled = getBundledExample(moduleId);
    if (bundled) {
      return formatExample(bundled.moduleId, bundled.content, bundled.features) + formatBundledFallbackNote();
    }
    return `No example found for module: ${moduleId}${formatBundledFallbackNote()}`;
  }

  if (pattern) {
    const examples = await findExamplesByPattern(pattern);
    if (examples.length > 0) {
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
    const bundled = findBundledByPattern(pattern);
    if (bundled.length > 0) {
      return (
        `# Examples Matching Pattern: ${pattern} (bundled)${formatBundledFallbackNote()}

` +
        bundled
          .map(
            (ex) => `## Module: ${ex.moduleId}

**Features:** ${ex.features.join(', ')}

\`\`\`typescript
${ex.content.substring(0, 1000)}${ex.content.length > 1000 ? '\n// ... (truncated)' : ''}
\`\`\`
`
          )
          .join('\n---\n\n')
      );
    }
    return `No examples found matching pattern: ${pattern}${formatBundledFallbackNote()}`;
  }

  if (feature) {
    const examples = await findExamplesByFeature(feature);
    if (examples.length > 0) {
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
    const bundled = findBundledByFeature(feature);
    if (bundled.length > 0) {
      return (
        `# Examples for Feature: ${feature} (bundled)${formatBundledFallbackNote()}

` +
        bundled
          .map(
            (ex) => `## Module: ${ex.moduleId}

**Features:** ${ex.features.join(', ')}

\`\`\`typescript
${ex.content.substring(0, 1000)}${ex.content.length > 1000 ? '\n// ... (truncated)' : ''}
\`\`\`
`
          )
          .join('\n---\n\n')
      );
    }
    return `No examples found for feature: ${feature}${formatBundledFallbackNote()}`;
  }

  const example = await loadExampleModule();
  if (example) {
    return formatExample(example.moduleId, example.content, example.features);
  }

  const first = listBundledExamples()[0];
  if (first) {
    return (
      formatExample(first.moduleId, first.content, first.features) +
      formatBundledFallbackNote()
    );
  }

  return 'No example modules available.';
}
