import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface NavSection {
  key: string;
  name: string;
  icon?: string;
  order?: number;
}

interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  placement: 'sidebar' | 'bottom-navbar' | 'both';
  permission?: string;
  order?: number;
  sectionKey?: string;
}

interface GenerateNavigationArgs {
  moduleId: string;
  section?: NavSection;
  items: NavItem[];
}

export async function generateNavigation(args: GenerateNavigationArgs): Promise<string> {
  const { moduleId, section, items } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  if (!items || items.length === 0) {
    throw new Error('At least one navigation item is required');
  }

  const camelCaseModuleId = toCamelCase(moduleId);

  // Generate section code if provided
  let sectionCode = '';
  let sectionVarName = '';
  if (section) {
    sectionVarName = `${camelCaseModuleId}NavSection`;
    sectionCode = `// Navigation Section
const ${sectionVarName} = navSection('${section.key}', '${section.name}', {
  icon: '${section.icon || 'folder'}',
  order: ${section.order || 1},
});`;
  }

  // Generate navigation items code
  const navItemsCode = items
    .map((item, idx) => {
      const sectionKeyStr = item.sectionKey || section?.key;
      const options: string[] = [];
      
      if (sectionKeyStr) {
        options.push(`sectionKey: '${sectionKeyStr}'`);
      }
      if (item.permission) {
        options.push(`permission: '${item.permission}'`);
      }
      options.push(`order: ${item.order || idx + 1}`);

      return `  navItem('${item.key}', '${item.label}', '${item.icon}', '${item.path}', '${item.placement}', {
    ${options.join(',\n    ')},
  })`;
    })
    .join(',\n');

  const navItemsArrayCode = `// Navigation Items
const navItems = [
${navItemsCode},
];`;

  // Generate registration code
  const registrationCalls: string[] = [];
  if (section) {
    registrationCalls.push(`.registerNavSection(${sectionVarName})`);
  }
  registrationCalls.push('.registerNavItems(navItems)');

  return `# Navigation Generated

## Navigation Code

\`\`\`typescript
import { navSection, navItem } from '@frameio/sdk';

${sectionCode}

${navItemsArrayCode}
\`\`\`

## Module Registration

Add navigation to your module:

\`\`\`typescript
export const ${camelCaseModuleId}Module = createModule({
  id: '${moduleId}',
  // ... other config
})
  ${registrationCalls.join('\n  ')}
  .build();
\`\`\`

## Navigation Summary

${section ? `### Section: ${section.name} (\`${section.key}\`)` : ''}

### Items:

| Key | Label | Icon | Path | Placement |
|-----|-------|------|------|-----------|
${items.map((item) => `| \`${item.key}\` | ${item.label} | ${item.icon} | ${item.path} | ${item.placement} |`).join('\n')}

## Placement Options

- **sidebar** - Only visible in the sidebar menu
- **bottom-navbar** - Only visible in mobile bottom navigation
- **both** - Visible in both locations

## Icon Reference

Common Lucide icons:
- \`home\`, \`dashboard\`, \`settings\`, \`users\`, \`user\`
- \`list\`, \`grid\`, \`table\`, \`folder\`, \`file\`
- \`package\`, \`box\`, \`shopping-cart\`, \`credit-card\`
- \`chart-bar\`, \`pie-chart\`, \`trending-up\`, \`activity\`
- \`plus\`, \`edit\`, \`trash\`, \`search\`, \`filter\`

See all icons at: https://lucide.dev/icons
`;
}
