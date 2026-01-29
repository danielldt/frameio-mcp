export function getFrameworkGuide(): string {
  return `# FrameIO Framework Guide

## Module Structure

### Directory Structure
\`\`\`
modules/
  my-module/
    package.json          # Module package configuration
    tsconfig.json         # TypeScript configuration
    src/
      index.ts           # Main module registration file (REQUIRED)
      pages/
        index.ts         # Export custom page components (optional)
        MyCustomPage.tsx # Custom page component (optional)
      sidebars/
        .gitkeep         # Placeholder for sidebar components (optional)
\`\`\`

### Module Registration

Modules must be registered in \`modules/.registry.ts\`. 

**Automatic Registration:** The FrameIO CLI automatically adds modules to the registry when you run:
\`\`\`bash
npx @frameio/cli create-module my-module
\`\`\`

**Manual Registration:** If creating modules manually, add to \`modules/.registry.ts\`:

\`\`\`typescript
export const registeredModules = [
  {
    moduleId: 'my-module',
    importPath: '@frameio/my-module',
  },
] as const;
\`\`\`

**Dynamic Loading:** After adding a module, restart Docker Compose (\`docker-compose restart\`) or development servers to load it.

### Module Export Convention

Export name must follow \`{camelCaseModuleId}Module\` pattern:
- Module ID: \`pos-bom\` → Export: \`posBomModule\`
- Module ID: \`my-module\` → Export: \`myModule\`

## Entity Definition

### Basic Entity Structure

\`\`\`typescript
import { defineEntity } from '@frameio/sdk';

const myEntity = defineEntity('my-module.entity_key')
  .name('Entity Name')
  .pluralName('Entity Names')
  .description('Description of the entity')
  .icon('icon-name')
  // ... fields ...
  .permissions({
    read: 'my-module.entity_key.read',
    create: 'my-module.entity_key.create',
    update: 'my-module.entity_key.update',
    delete: 'my-module.entity_key.delete',
  })
  .tableView(['field1', 'field2', 'field3'])
  .build();
\`\`\`

### Entity Key Convention
- Format: \`{module-id}.{entity-name}\` (e.g., \`pos-bom.bom_item\`)
- Use snake_case for entity names
- Must be unique across all modules

## Field Types

### Available Field Types

1. **String Field** - Short text (< 255 chars)
   \`\`\`typescript
   .stringField('name', 'Name', { required: true, unique: true })
   \`\`\`

2. **Text Field** - Multi-line text
   \`\`\`typescript
   .textField('description', 'Description')
   \`\`\`

3. **Number Field** - Integer values
   \`\`\`typescript
   .numberField('quantity', 'Quantity', { defaultValue: 0, validation: { min: 0 } })
   \`\`\`

4. **Decimal Field** - Decimal values
   \`\`\`typescript
   .decimalField('price', 'Price', { validation: { min: 0, precision: 2 } })
   \`\`\`

5. **Boolean Field** - True/false values
   \`\`\`typescript
   .booleanField('isActive', 'Is Active', { defaultValue: false })
   \`\`\`

6. **Date Field** - Date only
   \`\`\`typescript
   .dateField('birthDate', 'Birth Date')
   \`\`\`

7. **DateTime Field** - Date and time
   \`\`\`typescript
   .datetimeField('createdAt', 'Created At', { defaultValue: new Date().toISOString() })
   \`\`\`

8. **Email Field** - Email addresses
   \`\`\`typescript
   .emailField('email', 'Email', { required: true, unique: true })
   \`\`\`

9. **Phone Field** - Phone numbers
   \`\`\`typescript
   .phoneField('phone', 'Phone Number')
   \`\`\`

10. **URL Field** - Web URLs
    \`\`\`typescript
    .urlField('website', 'Website')
    \`\`\`

11. **Select Field** - Single choice dropdown
    \`\`\`typescript
    .selectField('status', 'Status', [
      { value: 'active', label: 'Active', color: '#22C55E' },
      { value: 'inactive', label: 'Inactive', color: '#EF4444' },
    ], { defaultValue: 'active' })
    \`\`\`

12. **Multi-Select Field** - Multiple choices
    \`\`\`typescript
    .multiselectField('tags', 'Tags', [
      { value: 'urgent', label: 'Urgent', color: '#EF4444' },
    ], { defaultValue: [] })
    \`\`\`

13. **Reference Field** - Foreign key relationship
    \`\`\`typescript
    .referenceField('customerId', 'Customer', 'other-module.customer', { required: true })
    \`\`\`

14. **Location Field** - Latitude/longitude
    \`\`\`typescript
    .locationField('address', 'Location')
    \`\`\`

15. **Currency Field** - Money values
    \`\`\`typescript
    .currencyField('price', 'Price', { validation: { min: 0 } })
    \`\`\`

16. **Percentage Field** - 0-100 percentage
    \`\`\`typescript
    .percentageField('completion', 'Completion', { validation: { min: 0, max: 100 } })
    \`\`\`

17. **JSON Field** - Structured JSON data
    \`\`\`typescript
    .jsonField('metadata', 'Metadata')
    \`\`\`

### Field Options

All fields support:
- \`required: boolean\` - Field is required
- \`unique: boolean\` - Field value must be unique
- \`defaultValue: any\` - Default value
- \`validation: { min, max, minLength, maxLength, pattern }\` - Validation rules
- \`hidden: boolean\` - Hide field from UI

## View Types

### Table View
\`\`\`typescript
.tableView(['field1', 'field2', 'field3'])
\`\`\`

### Kanban View
\`\`\`typescript
.kanbanView({
  groupByField: 'status',
  titleField: 'name',
}, { columns: ['name', 'status', 'priority'] })
\`\`\`

### Calendar View
\`\`\`typescript
.calendarView({
  dateField: 'startDate',
  titleField: 'name',
})
\`\`\`

### Gantt View
\`\`\`typescript
.ganttView({
  startDateField: 'startDate',
  endDateField: 'endDate',
  titleField: 'name',
  progressField: 'completion',
})
\`\`\`

### Map View
\`\`\`typescript
.mapView({
  locationField: 'address',
  titleField: 'name',
})
\`\`\`

## Permissions

### Creating Permissions

\`\`\`typescript
import { permission } from '@frameio/sdk';

const permissions = [
  permission('my-module.entity.read', 'View Entity', 'Can view entities'),
  permission('my-module.entity.create', 'Create Entity', 'Can create entities'),
  permission('my-module.entity.update', 'Update Entity', 'Can update entities'),
  permission('my-module.entity.delete', 'Delete Entity', 'Can delete entities'),
];
\`\`\`

### Permission ID Convention
- Format: \`{module-id}.{entity-key}.{action}\`
- Actions: \`read\`, \`create\`, \`update\`, \`delete\`

## Navigation

### Navigation Section
\`\`\`typescript
import { navSection } from '@frameio/sdk';

const myNavSection = navSection('my-module-nav', 'My Module', {
  icon: 'package',
  order: 1,
});
\`\`\`

### Navigation Items
\`\`\`typescript
import { navItem } from '@frameio/sdk';

const navItems = [
  navItem('my-module-entities', 'Entities', 'list', '/entities/my-module.entity', 'sidebar', {
    sectionKey: 'my-module-nav',
    permission: 'my-module.entity.read',
    order: 1,
  }),
];
\`\`\`

### Navigation Placement
- \`'sidebar'\` - Only in sidebar
- \`'bottom-navbar'\` - Only in bottom navbar (mobile)
- \`'both'\` - Both locations

## Commands

Commands appear in the command palette (Ctrl+K / Cmd+K):

\`\`\`typescript
import { command } from '@frameio/sdk';

const commands = [
  command('my-module-new', 'New Entity', 'action', 'navigate', {
    description: 'Create a new entity',
    icon: 'plus',
    path: '/entities/my-module.entity/new',
    permission: 'my-module.entity.create',
    keywords: ['create', 'add', 'new'],
  }),
];
\`\`\`

## Stat Cards

Display statistics above entity tables:

\`\`\`typescript
import { statCard, countQuery, filterAction } from '@frameio/sdk';

const statCards = [
  statCard('my-module-total', 'Total Entities', {
    icon: 'Layers',
    color: '#3b82f6',
    entityKey: 'my-module.entity',
    query: countQuery('my-module.entity', { refreshInterval: 60000 }),
    onClick: filterAction([]),
    order: 1,
    permission: 'my-module.entity.read',
  }),
];
\`\`\`

## Quick Links

Navigation cards on dashboard and entity pages:

\`\`\`typescript
import { quickLink } from '@frameio/sdk';

const quickLinks = [
  quickLink('my-module-link', 'My Module', 'Package', '/entities/my-module.entity', 'dashboard', {
    description: 'Manage entities',
    color: '#8b5cf6',
    order: 1,
    permission: 'my-module.entity.read',
  }),
];
\`\`\`

## Module Registration

### Complete Example

\`\`\`typescript
import {
  createModule,
  defineEntity,
  permission,
  navItem,
  navSection,
  command,
  statCard,
  quickLink,
  countQuery,
  filterAction,
} from '@frameio/sdk';

const myEntity = defineEntity('my-module.entity')
  .name('Entity')
  .pluralName('Entities')
  .description('My entity description')
  .icon('package')
  .stringField('name', 'Name', { required: true })
  .numberField('quantity', 'Quantity', { defaultValue: 0 })
  .permissions({
    read: 'my-module.entity.read',
    create: 'my-module.entity.create',
    update: 'my-module.entity.update',
    delete: 'my-module.entity.delete',
  })
  .tableView(['name', 'quantity'])
  .build();

const permissions = [
  permission('my-module.entity.read', 'View Entities', 'Can view entities'),
  permission('my-module.entity.create', 'Create Entities', 'Can create entities'),
  permission('my-module.entity.update', 'Update Entities', 'Can update entities'),
  permission('my-module.entity.delete', 'Delete Entities', 'Can delete entities'),
];

export const myModule = createModule({
  id: 'my-module',
  version: '1.0.0',
  displayName: 'My Module',
  description: 'Module description',
  icon: 'package',
})
  .registerPermissions(permissions)
  .registerEntities([myEntity])
  .build();
\`\`\`

## Custom Pages

### Creating Custom Pages

1. Create page component:
\`\`\`typescript
// src/pages/MyCustomPage.tsx
import React from 'react';
import { usePlatformData } from '@frameio/sdk';

export function MyCustomPage() {
  const { data, loading } = usePlatformData('my-module.entity');
  return <div>My Custom Page</div>;
}
\`\`\`

2. Export from pages/index.ts:
\`\`\`typescript
// src/pages/index.ts
export { MyCustomPage } from './MyCustomPage.js';
\`\`\`

Pages are automatically discovered and registered by the framework.

## Dashboard Widgets

Modules can register custom widgets for the dashboard:

\`\`\`typescript
import { widget } from '@frameio/sdk';

const widgets = [
  widget('my-module-stats', 'stat', {
    title: 'Total Items',
    entityKey: 'my-module.entity',
    // Widget data provider registered separately in backend
  }),
];
\`\`\`

Widget types: \`stat\`, \`table\`, \`list\`, \`chart\`

## Development Tools

### Storybook
FrameIO includes Storybook for component development:
- Access at \`http://localhost:6006\` when running \`docker-compose up\`
- Or run locally: \`cd apps/web && npm run storybook\`
- View isolated component examples and documentation

### Database Migrations
FrameIO uses a versioned migration system:
- Migrations in \`apps/api/src/db/migrate.ts\`
- Version tracking with \`migration_history\` table
- Rollback support: \`npm run migrate:rollback -w @frameio/api\`
- Only pending migrations are executed automatically

### Module Discovery
- Modules are dynamically discovered from \`modules/.registry.ts\`
- Frontend imports are auto-generated via \`npm run generate:imports\`
- Vite config is auto-updated via \`npm run generate:vite-config\`
- Dependencies are auto-synced via \`npm run sync:dependencies\`
- These run automatically via \`predev\` and \`prebuild\` hooks
`;
}
