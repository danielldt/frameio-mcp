import fs from 'fs-extra';
import path from 'path';
import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface GenerateDocumentationArgs {
  modulePath: string;
  outputType?: 'readme' | 'api' | 'full';
}

export async function generateDocumentation(args: GenerateDocumentationArgs): Promise<string> {
  const { modulePath, outputType = 'readme' } = args;

  const fullPath = path.resolve(process.cwd(), modulePath);
  const moduleId = path.basename(fullPath);

  // Check if module exists
  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Module directory not found: ${modulePath}`);
  }

  // Read module index.ts
  const indexPath = path.join(fullPath, 'src', 'index.ts');
  let moduleContent = '';
  if (await fs.pathExists(indexPath)) {
    moduleContent = await fs.readFile(indexPath, 'utf-8');
  }

  // Read package.json
  const packageJsonPath = path.join(fullPath, 'package.json');
  let packageJson: Record<string, unknown> = {};
  if (await fs.pathExists(packageJsonPath)) {
    packageJson = await fs.readJson(packageJsonPath);
  }

  // Extract module info
  const moduleInfo = extractModuleInfo(moduleContent, moduleId);

  // Generate documentation based on type
  let documentation = '';
  switch (outputType) {
    case 'readme':
      documentation = generateReadme(moduleId, moduleInfo, packageJson);
      break;
    case 'api':
      documentation = generateApiDocs(moduleId, moduleInfo);
      break;
    case 'full':
      documentation = generateFullDocs(moduleId, moduleInfo, packageJson);
      break;
  }

  return `# Documentation Generated

## Output Type: ${outputType}

${documentation}

## File Location

Save as \`${modulePath}/README.md\` or copy to your documentation system.
`;
}

interface ModuleInfo {
  displayName: string;
  description: string;
  version: string;
  entities: Array<{
    key: string;
    name: string;
    description: string;
    fields: string[];
    views: string[];
  }>;
  permissions: Array<{
    key: string;
    name: string;
    description: string;
  }>;
  workflows: Array<{
    key: string;
    name: string;
    entityKey: string;
    states: string[];
  }>;
  navigation: Array<{
    key: string;
    label: string;
    path: string;
  }>;
  pages: string[];
  widgets: string[];
}

function extractModuleInfo(content: string, moduleId: string): ModuleInfo {
  const info: ModuleInfo = {
    displayName: '',
    description: '',
    version: '1.0.0',
    entities: [],
    permissions: [],
    workflows: [],
    navigation: [],
    pages: [],
    widgets: [],
  };

  // Extract module metadata
  const displayNameMatch = content.match(/displayName:\s*['"]([^'"]+)['"]/);
  if (displayNameMatch) info.displayName = displayNameMatch[1];

  const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
  if (descriptionMatch) info.description = descriptionMatch[1];

  const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
  if (versionMatch) info.version = versionMatch[1];

  // Extract entities
  const entityMatches = content.matchAll(/defineEntity\(['"]([\w.-]+)['"]\)[\s\S]*?\.name\(['"]([^'"]+)['"]\)[\s\S]*?\.description\(['"]([^'"]+)['"]\)/g);
  for (const match of entityMatches) {
    info.entities.push({
      key: match[1],
      name: match[2],
      description: match[3],
      fields: extractFields(content, match[1]),
      views: extractViews(content),
    });
  }

  // Extract permissions
  const permissionMatches = content.matchAll(/permission\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g);
  for (const match of permissionMatches) {
    info.permissions.push({
      key: match[1],
      name: match[2],
      description: match[3],
    });
  }

  // Extract workflows
  const workflowMatches = content.matchAll(/defineWorkflow\(['"]([\w.-]+)['"]\)[\s\S]*?\.name\(['"]([^'"]+)['"]\)[\s\S]*?\.forEntity\(['"]([^'"]+)['"]/g);
  for (const match of workflowMatches) {
    info.workflows.push({
      key: match[1],
      name: match[2],
      entityKey: match[3],
      states: extractStates(content, match[1]),
    });
  }

  // Extract navigation
  const navMatches = content.matchAll(/navItem\(['"]([\w-]+)['"],\s*['"]([^'"]+)['"],\s*['"][^'"]+['"],\s*['"]([^'"]+)['"]/g);
  for (const match of navMatches) {
    info.navigation.push({
      key: match[1],
      label: match[2],
      path: match[3],
    });
  }

  return info;
}

function extractFields(content: string, entityKey: string): string[] {
  const fields: string[] = [];
  const fieldMethods = [
    'stringField', 'textField', 'numberField', 'decimalField',
    'booleanField', 'dateField', 'datetimeField', 'emailField',
    'phoneField', 'urlField', 'selectField', 'referenceField',
  ];

  for (const method of fieldMethods) {
    const matches = content.matchAll(new RegExp(`\\.${method}\\(['"]([^'"]+)['"],\\s*['"]([^'"]+)['"]`, 'g'));
    for (const match of matches) {
      fields.push(`${match[1]} (${match[2]})`);
    }
  }

  return fields;
}

function extractViews(content: string): string[] {
  const views: string[] = [];
  if (content.includes('.tableView(')) views.push('table');
  if (content.includes('.kanbanView(')) views.push('kanban');
  if (content.includes('.calendarView(')) views.push('calendar');
  if (content.includes('.ganttView(')) views.push('gantt');
  if (content.includes('.mapView(')) views.push('map');
  return views;
}

function extractStates(content: string, workflowKey: string): string[] {
  const states: string[] = [];
  const stateMatches = content.matchAll(/\.(initial|intermediate|final|cancelled)State\(['"]([^'"]+)['"]/g);
  for (const match of stateMatches) {
    states.push(`${match[2]} (${match[1]})`);
  }
  return states;
}

function generateReadme(moduleId: string, info: ModuleInfo, packageJson: Record<string, unknown>): string {
  return `# ${info.displayName || toPascalCase(moduleId)}

${info.description || 'A FrameIO module.'}

## Overview

- **Module ID:** \`${moduleId}\`
- **Version:** ${info.version}
- **Package:** \`@frameio/${moduleId}\`

## Installation

This module is part of the FrameIO monorepo. To enable it:

1. Add to \`modules/.registry.ts\`:
\`\`\`typescript
{
  moduleId: '${moduleId}',
  importPath: '@frameio/${moduleId}',
}
\`\`\`

2. Restart the development server:
\`\`\`bash
docker-compose restart
\`\`\`

## Entities

${info.entities.length > 0 ? info.entities.map((e) => `
### ${e.name}

**Key:** \`${e.key}\`

${e.description}

**Fields:**
${e.fields.map((f) => `- ${f}`).join('\n')}

**Views:** ${e.views.join(', ') || 'table'}
`).join('\n') : 'No entities defined.'}

## Permissions

${info.permissions.length > 0 ? `
| Permission | Name | Description |
|------------|------|-------------|
${info.permissions.map((p) => `| \`${p.key}\` | ${p.name} | ${p.description} |`).join('\n')}
` : 'No permissions defined.'}

## Navigation

${info.navigation.length > 0 ? `
| Label | Path |
|-------|------|
${info.navigation.map((n) => `| ${n.label} | ${n.path} |`).join('\n')}
` : 'No navigation items defined.'}

${info.workflows.length > 0 ? `
## Workflows

${info.workflows.map((w) => `
### ${w.name}

**Key:** \`${w.key}\`
**Entity:** \`${w.entityKey}\`
**States:** ${w.states.join(', ')}
`).join('\n')}
` : ''}

## Development

\`\`\`bash
# Build module
npm run build -w @frameio/${moduleId}

# Watch mode
npm run dev -w @frameio/${moduleId}

# Run tests
npm test -w @frameio/${moduleId}
\`\`\`

## License

Private - Internal use only.
`;
}

function generateApiDocs(moduleId: string, info: ModuleInfo): string {
  let docs = `# ${info.displayName || moduleId} API Reference

## Base URL

\`/api/v1/data\`

`;

  for (const entity of info.entities) {
    docs += `
## ${entity.name}

**Entity Key:** \`${entity.key}\`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/data/${entity.key}/query\` | Query records |
| GET | \`/data/${entity.key}/:id\` | Get single record |
| POST | \`/data/${entity.key}\` | Create record |
| PUT | \`/data/${entity.key}/:id\` | Update record |
| DELETE | \`/data/${entity.key}/:id\` | Delete record |

### Fields

| Field | Type |
|-------|------|
${entity.fields.map((f) => `| ${f.split(' (')[0]} | ${f.split(' (')[1]?.replace(')', '') || 'unknown'} |`).join('\n')}

`;
  }

  return docs;
}

function generateFullDocs(moduleId: string, info: ModuleInfo, packageJson: Record<string, unknown>): string {
  return generateReadme(moduleId, info, packageJson) + '\n\n---\n\n' + generateApiDocs(moduleId, info);
}
