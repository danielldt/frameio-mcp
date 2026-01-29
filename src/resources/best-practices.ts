export function getBestPractices(): string {
  return `# FrameIO Module Best Practices

## Naming Conventions

### Module IDs
- Use **kebab-case**: \`my-module\`, \`pos-bom\`, \`module-rewards\`
- Lowercase letters, numbers, and hyphens only
- Descriptive and concise

### Entity Keys
- Format: \`{module-id}.{entity-name}\`
- Use **snake_case** for entity names: \`bom_item\`, \`inventory_item\`
- Example: \`pos-bom.bom_item\`, \`my-module.product\`

### Permission IDs
- Format: \`{module-id}.{entity-key}.{action}\`
- Actions: \`read\`, \`create\`, \`update\`, \`delete\`
- Example: \`pos-bom.bom_item.read\`

### Export Names
- Format: \`{camelCaseModuleId}Module\`
- \`pos-bom\` → \`posBomModule\`
- \`my-module\` → \`myModule\`

## Entity Design Patterns

### 1. Status Workflow Pattern

Use select fields for status with appropriate colors:

\`\`\`typescript
.selectField('status', 'Status', [
  { value: 'draft', label: 'Draft', color: '#9CA3AF' },
  { value: 'active', label: 'Active', color: '#22C55E' },
  { value: 'inactive', label: 'Inactive', color: '#F59E0B' },
  { value: 'archived', label: 'Archived', color: '#EF4444' },
], { defaultValue: 'draft' })
.kanbanView({
  groupByField: 'status',
  titleField: 'name',
}, { columns: ['name', 'status'] })
\`\`\`

### 2. Reference Relationships

Always use reference fields for entity relationships:

\`\`\`typescript
.referenceField('customerId', 'Customer', 'my-module.customer', { required: true })
.referenceField('orderId', 'Order', 'my-module.order', { required: true })
\`\`\`

### 3. Computed Fields

Use computed fields for calculated values:

\`\`\`typescript
.numberField('subtotal', 'Subtotal', { validation: { min: 0 } })
.numberField('tax', 'Tax', { validation: { min: 0 } })
.numberField('total', 'Total', { 
  computed: true,
  validation: { min: 0 } 
})
\`\`\`

### 4. Timestamps

Always include created/updated timestamps:

\`\`\`typescript
.datetimeField('createdAt', 'Created At', { defaultValue: new Date().toISOString() })
.datetimeField('updatedAt', 'Updated At')
\`\`\`

## Field Selection Guidelines

### When to Use Each Field Type

1. **String vs Text**
   - \`stringField\`: Names, codes, short descriptions (< 255 chars)
   - \`textField\`: Long descriptions, notes, comments

2. **Number vs Decimal**
   - \`numberField\`: Quantities, counts, IDs (integers)
   - \`decimalField\`: Prices, measurements, percentages (decimals)

3. **Select vs Multi-Select**
   - \`selectField\`: Single choice (status, type, category)
   - \`multiselectField\`: Multiple choices (tags, categories)

4. **Reference Fields**
   - Always use for relationships to other entities
   - Format: \`{module-id}.{entity-key}\`

5. **Specialized Fields**
   - \`emailField\`: Email addresses (with validation)
   - \`phoneField\`: Phone numbers
   - \`urlField\`: Web URLs
   - \`currencyField\`: Money values
   - \`percentageField\`: 0-100 percentages
   - \`locationField\`: Geographic coordinates

## Module Organization

### File Structure
\`\`\`
modules/my-module/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts          # Main module registration
│   ├── pages/            # Custom page components
│   │   ├── index.ts      # Export all pages
│   │   └── MyPage.tsx    # Page component
│   └── sidebars/         # Sidebar components (optional)
\`\`\`

### Code Organization

1. **Import statements** at the top
2. **Entity definitions** grouped together
3. **Permissions** array
4. **Navigation** (sections, items)
5. **Commands** array
6. **Stat cards** array
7. **Quick links** array
8. **Module registration** at the bottom

### Example Structure

\`\`\`typescript
import { createModule, defineEntity, ... } from '@frameio/sdk';

// Entity definitions
const entity1 = defineEntity(...).build();
const entity2 = defineEntity(...).build();

// Permissions
const permissions = [...];

// Navigation
const navSection = navSection(...);
const navItems = [...];

// Commands
const commands = [...];

// Stat cards
const statCards = [...];

// Quick links
const quickLinks = [...];

// Module registration
export const myModule = createModule({...})
  .registerPermissions(permissions)
  .registerEntities([entity1, entity2])
  .registerNavSection(navSection)
  .registerNavItems(navItems)
  .registerCommands(commands)
  .registerStatCards(statCards)
  .registerQuickLinks(quickLinks)
  .build();
\`\`\`

## View Configuration

### Table View
- Include most important fields
- Order by importance (left to right)
- Limit to 5-7 columns for readability

\`\`\`typescript
.tableView(['name', 'status', 'createdAt', 'updatedAt'])
\`\`\`

### Kanban View
- Group by status or category field
- Show key information in columns
- Use for workflow visualization

\`\`\`typescript
.kanbanView({
  groupByField: 'status',
  titleField: 'name',
}, { columns: ['name', 'priority', 'assignee'] })
\`\`\`

## Permission Design

### Standard CRUD Permissions
Always define four basic permissions per entity:
- \`read\` - View records
- \`create\` - Create records
- \`update\` - Update records
- \`delete\` - Delete records

### Custom Permissions
Add custom permissions for special actions:
- \`approve\` - Approval actions
- \`export\` - Export data
- \`import\` - Import data

## Navigation Best Practices

### Navigation Sections
- Group related items together
- Use descriptive names
- Set appropriate order (lower = higher priority)

### Navigation Items
- Use clear, concise labels
- Choose appropriate icons (Lucide icons)
- Set proper permissions
- Order logically

### Placement
- \`sidebar\`: Main navigation
- \`bottom-navbar\`: Mobile quick access
- \`both\`: Important items accessible everywhere

## Command Palette

### Command Types
- \`action\`: Create new records, perform actions
- \`module\`: Navigate to module sections
- \`navigate\`: Navigation action type

### Keywords
- Include synonyms and related terms
- Use lowercase
- Think about how users would search

\`\`\`typescript
command('my-module-new', 'New Product', 'action', 'navigate', {
  keywords: ['create', 'add', 'new', 'product', 'item'],
})
\`\`\`

## Common Patterns

### Pattern 1: Master-Detail Entities

\`\`\`typescript
// Master entity
const orderEntity = defineEntity('my-module.order')
  .stringField('orderNumber', 'Order Number', { required: true, unique: true })
  .build();

// Detail entity
const orderItemEntity = defineEntity('my-module.order_item')
  .referenceField('orderId', 'Order', 'my-module.order', { required: true })
  .numberField('quantity', 'Quantity', { required: true })
  .build();
\`\`\`

### Pattern 2: Status-Based Workflow

\`\`\`typescript
.selectField('status', 'Status', [
  { value: 'draft', label: 'Draft', color: '#9CA3AF' },
  { value: 'submitted', label: 'Submitted', color: '#3B82F6' },
  { value: 'approved', label: 'Approved', color: '#22C55E' },
  { value: 'rejected', label: 'Rejected', color: '#EF4444' },
], { defaultValue: 'draft' })
.kanbanView({
  groupByField: 'status',
  titleField: 'name',
})
\`\`\`

### Pattern 3: Hierarchical Data

\`\`\`typescript
.referenceField('parentId', 'Parent', 'my-module.category', { required: false })
.stringField('name', 'Name', { required: true })
.numberField('level', 'Level', { defaultValue: 0 })
\`\`\`

## Validation Rules

### Required Fields
- Mark essential fields as required
- Don't overuse - only truly required fields

### Unique Fields
- Use for codes, emails, usernames
- Prevents duplicate entries

### Validation
- Set appropriate min/max values
- Use patterns for format validation
- Provide clear error messages

## Performance Considerations

1. **Limit Table View Columns**
   - Too many columns slow rendering
   - Show only essential fields

2. **Index Fields**
   - Mark frequently searched fields
   - Use unique constraints appropriately

3. **Lazy Loading**
   - Framework handles lazy loading automatically
   - Don't worry about code splitting

## Testing Checklist

Before completing a module:

- [ ] Module ID matches directory name
- [ ] Export name follows convention
- [ ] Entity keys follow format
- [ ] Permissions defined for all entities
- [ ] Navigation items configured
- [ ] Commands have proper keywords
- [ ] Views configured appropriately
- [ ] Registry entry added
- [ ] TypeScript compiles without errors
- [ ] Module loads without errors
`;
}
