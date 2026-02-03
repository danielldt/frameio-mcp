import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

type WidgetType = 'stat' | 'table' | 'list' | 'chart' | 'custom';

interface GenerateWidgetArgs {
  moduleId: string;
  widgetKey: string;
  widgetName: string;
  widgetType: WidgetType;
  description: string;
  entityKey?: string;
  propsSchema?: Record<string, unknown>;
  defaultProps?: Record<string, unknown>;
  permissions?: string[];
  componentName?: string;
}

export async function generateWidget(args: GenerateWidgetArgs): Promise<string> {
  const {
    moduleId,
    widgetKey,
    widgetName,
    widgetType,
    description,
    entityKey,
    propsSchema = {},
    defaultProps = {},
    permissions = [],
    componentName,
  } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  // Validate widget key format
  if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(widgetKey)) {
    throw new Error(
      'Widget key must be in format {module-id}.{widget-name} (e.g., pos.revenue-chart)'
    );
  }

  // Generate widget variable name
  const widgetVarName = widgetKey.split('.').pop()?.replace(/-/g, '') || 'widget';
  const camelCaseVar = widgetVarName.charAt(0).toLowerCase() + widgetVarName.slice(1);

  // Generate permissions array string
  const permissionsStr =
    permissions.length > 0
      ? `permissions: [${permissions.map((p) => `'${p}'`).join(', ')}],`
      : entityKey
      ? `permissions: ['${entityKey}.read'],`
      : '';

  // Generate widget definition
  const widgetDefinition = `const ${camelCaseVar}Widget = widget('${widgetKey}', '${widgetType}', {
  name: '${widgetName}',
  description: '${description}',
  ${entityKey ? `entityKey: '${entityKey}',` : ''}
  ${Object.keys(propsSchema).length > 0 ? `propsSchema: ${JSON.stringify(propsSchema, null, 2)},` : ''}
  ${Object.keys(defaultProps).length > 0 ? `defaultProps: ${JSON.stringify(defaultProps, null, 2)},` : ''}
  ${permissionsStr}
});`;

  // Generate custom widget component if type is 'custom' or componentName is provided
  let customComponentCode = '';
  const actualComponentName =
    componentName || toPascalCase(widgetKey.split('.').pop() || 'Custom') + 'Widget';

  if (widgetType === 'custom' || componentName) {
    customComponentCode = `
### Custom Widget Component

Create \`src/widgets/${actualComponentName}.tsx\`:

\`\`\`typescript
import React from 'react';
import type { WidgetMetadata } from '@frameio/shared';

interface ${actualComponentName}Props {
  data: Record<string, unknown>;
  widget: WidgetMetadata;
  formatNumber?: (num: number) => string;
}

export function ${actualComponentName}({ data, widget, formatNumber }: ${actualComponentName}Props) {
  return (
    <div className="${widgetKey.replace('.', '-')}-widget">
      <h3 className="widget-title">{widget.name}</h3>
      <div className="widget-content">
        {/* Add your custom widget content here */}
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>

      <style>{\`
        .${widgetKey.replace('.', '-')}-widget {
          background: var(--theme-surface, #1e293b);
          border: 1px solid var(--theme-border, #334155);
          border-radius: 8px;
          padding: 1rem;
          height: 100%;
        }

        .widget-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--theme-text, #f1f5f9);
          margin-bottom: 1rem;
        }

        .widget-content {
          color: var(--theme-text-secondary, #94a3b8);
          font-size: 0.875rem;
        }
      \`}</style>
    </div>
  );
}

export default ${actualComponentName};
\`\`\`

### Export Widget Component

Update \`src/widgets/index.ts\`:

\`\`\`typescript
export { ${actualComponentName} } from './${actualComponentName}.js';
\`\`\`
`;
  }

  // Generate backend data provider stub
  const dataProviderCode = `
### Backend Data Provider (Optional)

If your widget needs custom data, create a data provider in the API:

\`\`\`typescript
// In apps/api/src/services/widget-data.ts or module-specific file

export async function get${actualComponentName.replace('Widget', '')}Data(
  tenantId: string,
  props: Record<string, unknown>
): Promise<unknown> {
  // Fetch and aggregate data for this widget
  const { rows } = await db.query(
    \`SELECT COUNT(*) as count FROM data_records 
     WHERE tenant_id = $1 AND entity_key = $2\`,
    [tenantId, '${entityKey || 'your.entity'}']
  );
  
  return {
    value: rows[0]?.count || 0,
    label: '${widgetName}',
    // Add more data as needed
  };
}
\`\`\`
`;

  return `# Widget Definition Generated

## Widget Code

\`\`\`typescript
import { widget } from '@frameio/sdk';

${widgetDefinition}
\`\`\`

## Module Registration

Add the widget to your module:

\`\`\`typescript
export const ${toCamelCase(moduleId)}Module = createModule({
  id: '${moduleId}',
  // ... other config
})
  .registerWidgets([${camelCaseVar}Widget])
  .build();
\`\`\`
${customComponentCode}
${widgetType !== 'custom' ? dataProviderCode : ''}

## Widget Configuration Summary

| Property | Value |
|----------|-------|
| Key | \`${widgetKey}\` |
| Type | \`${widgetType}\` |
| Name | ${widgetName} |
${entityKey ? `| Entity | \`${entityKey}\` |` : ''}
${permissions.length > 0 ? `| Permissions | ${permissions.join(', ')} |` : ''}

## Widget Types Reference

- **stat** - Single value display (count, sum, average)
- **table** - Data table with rows and columns
- **list** - Simple list of items
- **chart** - Visualization (bar, line, pie, area)
- **custom** - Fully custom component
`;
}
