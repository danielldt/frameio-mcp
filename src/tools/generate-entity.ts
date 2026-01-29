export async function generateEntity(args: {
  entityKey: string;
  name: string;
  pluralName: string;
  description: string;
  fields: any[];
  icon?: string;
  views?: any[];
}): Promise<string> {
  const { entityKey, name, pluralName, description, fields, icon, views } = args;

  // Validate entity key format
  if (!/^[a-z0-9-]+\.[a-z0-9_]+$/.test(entityKey)) {
    throw new Error(
      'Entity key must be in format {module-id}.{entity-name} (e.g., my-module.product)'
    );
  }

  if (!fields || fields.length === 0) {
    throw new Error('At least one field is required');
  }

  // Generate entity variable name
  const entityVarName = entityKey.split('.').pop()?.replace(/_/g, '') || 'entity';
  const camelCaseVar = entityVarName.charAt(0).toLowerCase() + entityVarName.slice(1);

  // Generate field code
  const fieldCode = fields
    .map((field) => {
      const options = field.options || {};
      const opts: string[] = [];

      if (options.required) opts.push('required: true');
      if (options.unique) opts.push('unique: true');
      if (options.defaultValue !== undefined) {
        const defaultValue =
          typeof options.defaultValue === 'string'
            ? `'${options.defaultValue}'`
            : String(options.defaultValue);
        opts.push(`defaultValue: ${defaultValue}`);
      }
      if (options.validation) {
        opts.push(`validation: ${JSON.stringify(options.validation)}`);
      }

      const optsStr = opts.length > 0 ? `, { ${opts.join(', ')} }` : '';

      switch (field.type) {
        case 'string':
          return `  .stringField('${field.key}', '${field.name}'${optsStr})`;
        case 'text':
          return `  .textField('${field.key}', '${field.name}'${optsStr})`;
        case 'number':
          return `  .numberField('${field.key}', '${field.name}'${optsStr})`;
        case 'decimal':
          return `  .decimalField('${field.key}', '${field.name}'${optsStr})`;
        case 'boolean':
          return `  .booleanField('${field.key}', '${field.name}'${optsStr})`;
        case 'date':
          return `  .dateField('${field.key}', '${field.name}'${optsStr})`;
        case 'datetime':
          return `  .datetimeField('${field.key}', '${field.name}'${optsStr})`;
        case 'email':
          return `  .emailField('${field.key}', '${field.name}'${optsStr})`;
        case 'phone':
          return `  .phoneField('${field.key}', '${field.name}'${optsStr})`;
        case 'url':
          return `  .urlField('${field.key}', '${field.name}'${optsStr})`;
        case 'select':
          const selectOptions = field.options?.selectOptions || [];
          const selectOptsStr = selectOptions
            .map((opt: any) => `{ value: '${opt.value}', label: '${opt.label}', color: '${opt.color || '#3B82F6'}' }`)
            .join(', ');
          return `  .selectField('${field.key}', '${field.name}', [${selectOptsStr}]${optsStr})`;
        case 'multiselect':
          const multiSelectOptions = field.options?.selectOptions || [];
          const multiSelectOptsStr = multiSelectOptions
            .map((opt: any) => `{ value: '${opt.value}', label: '${opt.label}', color: '${opt.color || '#3B82F6'}' }`)
            .join(', ');
          return `  .multiselectField('${field.key}', '${field.name}', [${multiSelectOptsStr}]${optsStr})`;
        case 'reference':
          if (!field.options?.refEntityKey) {
            throw new Error(`Reference field '${field.key}' requires refEntityKey option`);
          }
          return `  .referenceField('${field.key}', '${field.name}', '${field.options.refEntityKey}'${optsStr})`;
        case 'location':
          return `  .locationField('${field.key}', '${field.name}'${optsStr})`;
        case 'currency':
          return `  .currencyField('${field.key}', '${field.name}'${optsStr})`;
        case 'percentage':
          return `  .percentageField('${field.key}', '${field.name}'${optsStr})`;
        case 'json':
          return `  .jsonField('${field.key}', '${field.name}'${optsStr})`;
        default:
          return `  .stringField('${field.key}', '${field.name}'${optsStr})`;
      }
    })
    .join('\n');

  // Generate view code
  let viewCode = '';
  if (views && views.length > 0) {
    viewCode = views
      .map((view) => {
        switch (view.type) {
          case 'table':
            const columns = view.columns || [];
            return `  .tableView([${columns.map((c: string) => `'${c}'`).join(', ')}])`;
          case 'kanban':
            if (!view.groupByField || !view.titleField) {
              throw new Error('Kanban view requires groupByField and titleField');
            }
            return `  .kanbanView({\n    groupByField: '${view.groupByField}',\n    titleField: '${view.titleField}',\n  }, { columns: [${(view.columns || []).map((c: string) => `'${c}'`).join(', ')}] })`;
          case 'calendar':
            if (!view.dateField || !view.titleField) {
              throw new Error('Calendar view requires dateField and titleField');
            }
            return `  .calendarView({\n    dateField: '${view.dateField}',\n    titleField: '${view.titleField}',\n  })`;
          case 'gantt':
            if (!view.startDateField || !view.endDateField || !view.titleField) {
              throw new Error('Gantt view requires startDateField, endDateField, and titleField');
            }
            return `  .ganttView({\n    startDateField: '${view.startDateField}',\n    endDateField: '${view.endDateField}',\n    titleField: '${view.titleField}',\n  })`;
          case 'map':
            if (!view.locationField || !view.titleField) {
              throw new Error('Map view requires locationField and titleField');
            }
            return `  .mapView({\n    locationField: '${view.locationField}',\n    titleField: '${view.titleField}',\n  })`;
          default:
            return `  .tableView([${fields.map((f) => `'${f.key}'`).join(', ')}])`;
        }
      })
      .join('\n');
  } else {
    // Default table view with all fields
    viewCode = `  .tableView([${fields.map((f) => `'${f.key}'`).join(', ')}])`;
  }

  // Generate permissions code
  const permissionsCode = `const permissions = [
  permission('${entityKey}.read', 'View ${pluralName}', 'Can view ${pluralName.toLowerCase()}'),
  permission('${entityKey}.create', 'Create ${pluralName}', 'Can create ${pluralName.toLowerCase()}'),
  permission('${entityKey}.update', 'Update ${pluralName}', 'Can update ${pluralName.toLowerCase()}'),
  permission('${entityKey}.delete', 'Delete ${pluralName}', 'Can delete ${pluralName.toLowerCase()}'),
];`;

  const entityCode = `// Entity: ${name}
const ${camelCaseVar}Entity = defineEntity('${entityKey}')
  .name('${name}')
  .pluralName('${pluralName}')
  .description('${description}')
${icon ? `  .icon('${icon}')` : ''}
${fieldCode}
  .permissions({
    read: '${entityKey}.read',
    create: '${entityKey}.create',
    update: '${entityKey}.update',
    delete: '${entityKey}.delete',
  })
${viewCode}
  .build();`;

  return `# Entity Definition Generated

## Entity Code

\`\`\`typescript
import { defineEntity, permission } from '@frameio/sdk';

${entityCode}

${permissionsCode}
\`\`\`

## Usage

Add this entity to your module registration:

\`\`\`typescript
export const myModule = createModule({
  id: '${entityKey.split('.')[0]}',
  version: '1.0.0',
  displayName: 'My Module',
  description: 'Module description',
})
  .registerPermissions(permissions)
  .registerEntities([${camelCaseVar}Entity])
  .build();
\`\`\`

## Field Summary

${fields.map((f) => `- **${f.name}** (${f.type}): ${f.options?.required ? 'Required' : 'Optional'}`).join('\n')}
`;
}
