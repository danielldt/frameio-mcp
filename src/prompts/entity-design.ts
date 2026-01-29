export function getEntityDesignGuide(args: {
  entityName?: string;
  moduleId?: string;
}): { messages: Array<{ role: string; content: string }> } {
  const { entityName, moduleId } = args;

  const content = `# Entity Design Guide

${entityName ? `**Designing Entity:** ${entityName}` : 'Guide for designing FrameIO entities'}

## Entity Key Format

Entity keys must follow: \`{module-id}.{entity-name}\`

${moduleId ? `**Module ID:** ${moduleId}` : ''}
${entityName ? `**Entity Name:** ${entityName}` : ''}
${moduleId && entityName ? `**Entity Key:** ${moduleId}.${entityName.toLowerCase().replace(/\s+/g, '_')}` : ''}

### Naming Rules
- Module ID: kebab-case (\`my-module\`)
- Entity Name: snake_case (\`product_item\`, \`order_line\`)
- Full Key: \`my-module.product_item\`

## Field Type Selection

### Text Fields
- **stringField**: Short text (< 255 chars) - names, codes, titles
- **textField**: Long text - descriptions, notes, comments
- **emailField**: Email addresses (with validation)
- **phoneField**: Phone numbers
- **urlField**: Web URLs

### Numeric Fields
- **numberField**: Integers - quantities, counts, IDs
- **decimalField**: Decimals - prices, measurements
- **currencyField**: Money values
- **percentageField**: 0-100 percentages

### Selection Fields
- **selectField**: Single choice dropdown
  - Use for: status, type, category
  - Provide options with colors
- **multiselectField**: Multiple choices
  - Use for: tags, categories, labels

### Date/Time Fields
- **dateField**: Date only (no time)
- **datetimeField**: Date and time
  - Use for: timestamps, schedules

### Relationship Fields
- **referenceField**: Link to another entity
  - Format: \`{module-id}.{entity-key}\`
  - Use for: foreign keys, relationships

### Special Fields
- **booleanField**: True/false checkbox
- **locationField**: Geographic coordinates (lat/lng)
- **jsonField**: Structured JSON data

## Field Design Best Practices

### 1. Required Fields
Mark essential fields as required:
\`\`\`typescript
.stringField('name', 'Name', { required: true })
\`\`\`

### 2. Unique Fields
Use for codes, emails, usernames:
\`\`\`typescript
.stringField('code', 'Code', { required: true, unique: true })
.emailField('email', 'Email', { required: true, unique: true })
\`\`\`

### 3. Default Values
Set sensible defaults:
\`\`\`typescript
.numberField('quantity', 'Quantity', { defaultValue: 0 })
.selectField('status', 'Status', [...], { defaultValue: 'active' })
.booleanField('isActive', 'Is Active', { defaultValue: true })
\`\`\`

### 4. Validation Rules
Add validation for data integrity:
\`\`\`typescript
.numberField('price', 'Price', {
  required: true,
  validation: { min: 0, max: 10000 }
})
.stringField('code', 'Code', {
  required: true,
  validation: { 
    minLength: 3,
    maxLength: 20,
    pattern: '^[A-Z0-9]+$'
  }
})
\`\`\`

## View Configuration

### Table View
Show most important fields:
\`\`\`typescript
.tableView(['name', 'status', 'price', 'createdAt'])
\`\`\`

**Guidelines:**
- Limit to 5-7 columns
- Order by importance
- Include key identifying fields

### Kanban View
For status-based workflows:
\`\`\`typescript
.kanbanView({
  groupByField: 'status',
  titleField: 'name',
}, { columns: ['name', 'priority', 'assignee'] })
\`\`\`

**Requirements:**
- Need a status/category field
- Group by that field
- Show key info in columns

### Calendar View
For date-based entities:
\`\`\`typescript
.calendarView({
  dateField: 'startDate',
  titleField: 'name',
})
\`\`\`

**Requirements:**
- Need a date field
- Title field for display

## Permission Structure

Always define four basic permissions:

\`\`\`typescript
.permissions({
  read: '${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'entity'}.read',
  create: '${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'entity'}.create',
  update: '${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'entity'}.update',
  delete: '${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'entity'}.delete',
})
\`\`\`

## Common Entity Patterns

### Pattern 1: Status-Based Entity
\`\`\`typescript
const entity = defineEntity('${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'item'}')
  .name('${entityName || 'Item'}')
  .pluralName('${entityName ? entityName + 's' : 'Items'}')
  .stringField('name', 'Name', { required: true })
  .selectField('status', 'Status', [
    { value: 'draft', label: 'Draft', color: '#9CA3AF' },
    { value: 'active', label: 'Active', color: '#22C55E' },
    { value: 'inactive', label: 'Inactive', color: '#F59E0B' },
  ], { defaultValue: 'draft' })
  .kanbanView({
    groupByField: 'status',
    titleField: 'name',
  })
  .build();
\`\`\`

### Pattern 2: Entity with Reference
\`\`\`typescript
const childEntity = defineEntity('${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'item'}')
  .referenceField('parentId', 'Parent', '${moduleId || 'my-module'}.parent', { required: true })
  .stringField('name', 'Name', { required: true })
  .build();
\`\`\`

### Pattern 3: Entity with Timestamps
\`\`\`typescript
const entity = defineEntity('${moduleId || 'my-module'}.${entityName ? entityName.toLowerCase().replace(/\s+/g, '_') : 'item'}')
  .stringField('name', 'Name', { required: true })
  .datetimeField('createdAt', 'Created At', { defaultValue: new Date().toISOString() })
  .datetimeField('updatedAt', 'Updated At')
  .build();
\`\`\`

## Design Checklist

When designing an entity, consider:

- [ ] Entity key follows naming convention
- [ ] All required fields marked
- [ ] Unique constraints on appropriate fields
- [ ] Default values set where appropriate
- [ ] Validation rules defined
- [ ] At least one view configured (table view minimum)
- [ ] Permissions defined for all CRUD operations
- [ ] Icon selected (optional but recommended)
- [ ] Description is clear and helpful

## Field Selection Decision Tree

1. **Is it text?**
   - Short (< 255 chars) → \`stringField\`
   - Long → \`textField\`
   - Email → \`emailField\`
   - Phone → \`phoneField\`
   - URL → \`urlField\`

2. **Is it a number?**
   - Integer → \`numberField\`
   - Decimal → \`decimalField\`
   - Money → \`currencyField\`
   - Percentage (0-100) → \`percentageField\`

3. **Is it a choice?**
   - Single choice → \`selectField\`
   - Multiple choices → \`multiselectField\`

4. **Is it a relationship?**
   - Link to another entity → \`referenceField\`

5. **Is it a date/time?**
   - Date only → \`dateField\`
   - Date and time → \`datetimeField\`

6. **Is it true/false?**
   - → \`booleanField\`

7. **Is it geographic?**
   - → \`locationField\`

8. **Is it flexible structured data?**
   - → \`jsonField\`
`;

  return {
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  };
}
