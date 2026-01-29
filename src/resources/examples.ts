import fs from 'fs-extra';
import path from 'path';
import { loadExampleModule } from '../utils/example-loader.js';

export async function getExample(moduleId: string): Promise<string> {
  const example = await loadExampleModule(moduleId);
  
  if (!example) {
    return `# Example Not Found

Module \`${moduleId}\` not found in modules directory.

Available modules can be found in \`modules/\` directory.
`;
  }

  return `# Example Module: ${moduleId}

## Features
${example.features.map((f) => `- ${f}`).join('\n')}

## Complete Source Code

\`\`\`typescript
${example.content}
\`\`\`

## Usage Notes

This example demonstrates:
${example.features.map((f) => {
  const descriptions: Record<string, string> = {
    'entities': 'Entity definitions with fields and views',
    'navigation': 'Navigation sections and items',
    'commands': 'Command palette entries',
    'stat-cards': 'Statistics cards for entity pages',
    'quick-links': 'Quick navigation links',
    'kanban-view': 'Kanban board view configuration',
    'calendar-view': 'Calendar view configuration',
    'gantt-view': 'Gantt chart view configuration',
    'map-view': 'Map view configuration',
    'reference-field': 'Entity relationships',
    'select-field': 'Dropdown selection fields',
    'multiselect-field': 'Multiple selection fields',
  };
  return `- **${f}**: ${descriptions[f] || 'Feature implementation'}`;
}).join('\n')}
`;
}
