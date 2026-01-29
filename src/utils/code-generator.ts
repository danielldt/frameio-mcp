import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function generatePackageJson(moduleId: string): string {
  return JSON.stringify(
    {
      name: `@frameio/${moduleId}`,
      version: '1.0.0',
      private: true,
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
        './pages': {
          import: './dist/pages/index.js',
          types: './dist/pages/index.d.ts',
        },
      },
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch',
      },
      dependencies: {
        '@frameio/sdk': '*',
        '@frameio/shared': '*',
        'lucide-react': '^0.563.0',
      },
      peerDependencies: {
        react: '^18.2.0',
        'react-router-dom': '^6.21.0',
      },
      devDependencies: {
        '@types/react': '^18.2.45',
        react: '^18.2.0',
        'react-router-dom': '^6.21.0',
        typescript: '^5.3.3',
      },
    },
    null,
    2
  );
}

export function generateTsConfig(): string {
  return JSON.stringify(
    {
      extends: '../../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  );
}

export function generateModuleIndex(
  moduleId: string,
  displayName: string,
  description: string,
  entities: any[] = [],
  includeNavigation: boolean = true,
  includeCommands: boolean = true
): string {
  const camelCaseId = toCamelCase(moduleId);
  const moduleExport = `${camelCaseId}Module`;

  let imports = "import { createModule } from '@frameio/sdk';";
  let entityCode = '';
  let permissionsCode = '';
  let navSectionCode = '';
  let navItemsCode = '';
  let commandsCode = '';
  let statCardsCode = '';
  let quickLinksCode = '';

  if (entities.length > 0) {
    imports += "\nimport { defineEntity, permission, navItem, navSection, command, statCard, quickLink, countQuery, filterAction } from '@frameio/sdk';";
    
    // Generate entity definitions
    entityCode = entities
      .map((entity, idx) => {
        const entityVar = `entity${idx + 1}`;
        return `// Entity: ${entity.name}\nconst ${entityVar} = defineEntity('${entity.key}')\n  .name('${entity.name}')\n  .pluralName('${entity.pluralName}')\n  .description('${entity.description}')\n${entity.icon ? `  .icon('${entity.icon}')` : ''}${generateFields(entity.fields)}  .permissions({\n    read: '${entity.key}.read',\n    create: '${entity.key}.create',\n    update: '${entity.key}.update',\n    delete: '${entity.key}.delete',\n  })\n${generateViews(entity.views)}\  .build();`;
      })
      .join('\n\n');

    // Generate permissions
    const allPermissions: string[] = [];
    entities.forEach((entity) => {
      allPermissions.push(
        `  permission('${entity.key}.read', 'View ${entity.pluralName}', 'Can view ${entity.pluralName.toLowerCase()}'),`,
        `  permission('${entity.key}.create', 'Create ${entity.pluralName}', 'Can create ${entity.pluralName.toLowerCase()}'),`,
        `  permission('${entity.key}.update', 'Update ${entity.pluralName}', 'Can update ${entity.pluralName.toLowerCase()}'),`,
        `  permission('${entity.key}.delete', 'Delete ${entity.pluralName}', 'Can delete ${entity.pluralName.toLowerCase()}'),`
      );
    });
    permissionsCode = `// Permissions\nconst permissions = [\n${allPermissions.join('\n')}\n];`;

    if (includeNavigation) {
      const navSectionKey = `${moduleId}-nav`;
      navSectionCode = `// Navigation Section\nconst ${camelCaseId}NavSection = navSection('${navSectionKey}', '${displayName}', {\n  icon: 'package',\n  order: 1,\n});`;

      navItemsCode = `// Navigation Items\nconst navItems = [\n${entities
        .map(
          (entity, idx) =>
            `  navItem('${moduleId}-${entity.key.split('.').pop()}', '${entity.pluralName}', 'list', '/entities/${entity.key}', 'sidebar', {\n    sectionKey: '${navSectionKey}',\n    permission: '${entity.key}.read',\n    order: ${idx + 1},\n  })`
        )
        .join(',\n')},\n];`;
    }

    if (includeCommands) {
      commandsCode = `// Command Palette Commands\nconst commands = [\n${entities
        .map(
          (entity) =>
            `  command('${moduleId}-new-${entity.key.split('.').pop()}', 'New ${entity.name}', 'action', 'navigate', {\n    description: 'Create a new ${entity.name.toLowerCase()}',\n    icon: 'plus',\n    path: '/entities/${entity.key}/new',\n    permission: '${entity.key}.create',\n    keywords: ['create', 'add', 'new', '${entity.name.toLowerCase()}'],\n  })`
        )
        .join(',\n')},\n];`;
    }
  }

  const entityVars = entities.map((_, idx) => `entity${idx + 1}`).join(', ');
  const registerCalls = [
    entities.length > 0 ? `.registerPermissions(permissions)` : '',
    entities.length > 0 ? `.registerEntities([${entityVars}])` : '',
    includeNavigation && entities.length > 0 ? `.registerNavSection(${camelCaseId}NavSection)` : '',
    includeNavigation && entities.length > 0 ? `.registerNavItems(navItems)` : '',
    includeCommands && entities.length > 0 ? `.registerCommands(commands)` : '',
  ]
    .filter(Boolean)
    .join('\n  ');

  return `${imports}

/**
 * ${displayName} Module
 * 
 * ${description}
 */

${entityCode}

${permissionsCode}

${navSectionCode}

${navItemsCode}

${commandsCode}

// Build and export the module
export const ${moduleExport} = createModule({
  id: '${moduleId}',
  version: '1.0.0',
  displayName: '${displayName}',
  description: '${description}',
  icon: 'package',
})
  ${registerCalls}
  .build();
`;
}

function generateFields(fields: any[]): string {
  if (!fields || fields.length === 0) return '';
  
  return fields
    .map((field) => {
      const options = field.options || {};
      const opts: string[] = [];
      
      if (options.required) opts.push('required: true');
      if (options.unique) opts.push('unique: true');
      if (options.defaultValue !== undefined) {
        const defaultValue = typeof options.defaultValue === 'string' 
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
          return `  .referenceField('${field.key}', '${field.name}', '${field.options?.refEntityKey}'${optsStr})`;
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
}

function generateViews(views: any[]): string {
  if (!views || views.length === 0) {
    return `  .tableView([])`;
  }

  return views
    .map((view) => {
      switch (view.type) {
        case 'table':
          const columns = view.columns || [];
          return `  .tableView([${columns.map((c: string) => `'${c}'`).join(', ')}])`;
        case 'kanban':
          return `  .kanbanView({\n    groupByField: '${view.groupByField}',\n    titleField: '${view.titleField}',\n  }, { columns: [${(view.columns || []).map((c: string) => `'${c}'`).join(', ')}] })`;
        case 'calendar':
          return `  .calendarView({\n    dateField: '${view.dateField}',\n    titleField: '${view.titleField}',\n  })`;
        case 'gantt':
          return `  .ganttView({\n    startDateField: '${view.startDateField}',\n    endDateField: '${view.endDateField}',\n    titleField: '${view.titleField}',\n  })`;
        case 'map':
          return `  .mapView({\n    locationField: '${view.locationField}',\n    titleField: '${view.titleField}',\n  })`;
        default:
          return `  .tableView([])`;
      }
    })
    .join('\n');
}

export function generateRegistryEntry(moduleId: string): string {
  return `  {\n    moduleId: '${moduleId}',\n    importPath: '@frameio/${moduleId}',\n  },`;
}
