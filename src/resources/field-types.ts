export function getFieldTypes(): string {
  return `# Field Types Reference

Complete reference of all available field types in FrameIO framework.

## String Field

Short text field (< 255 characters).

\`\`\`typescript
.stringField('name', 'Name', {
  required: true,
  unique: false,
  defaultValue: '',
  validation: {
    minLength: 3,
    maxLength: 100,
    pattern: '^[A-Z]',
  },
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`unique\` (boolean): Field value must be unique
- \`defaultValue\` (string): Default value
- \`validation.minLength\` (number): Minimum length
- \`validation.maxLength\` (number): Maximum length
- \`validation.pattern\` (string): Regex pattern

## Text Field

Multi-line text field for longer content.

\`\`\`typescript
.textField('description', 'Description', {
  required: false,
  defaultValue: '',
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (string): Default value

## Number Field

Integer numeric field.

\`\`\`typescript
.numberField('quantity', 'Quantity', {
  required: true,
  defaultValue: 0,
  validation: {
    min: 0,
    max: 1000,
  },
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (number): Default value
- \`validation.min\` (number): Minimum value
- \`validation.max\` (number): Maximum value

## Decimal Field

Decimal numeric field with precision.

\`\`\`typescript
.decimalField('price', 'Price', {
  required: true,
  validation: {
    min: 0,
    precision: 2,
  },
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (number): Default value
- \`validation.min\` (number): Minimum value
- \`validation.max\` (number): Maximum value
- \`validation.precision\` (number): Decimal places

## Boolean Field

True/false checkbox field.

\`\`\`typescript
.booleanField('isActive', 'Is Active', {
  defaultValue: false,
})
\`\`\`

**Options:**
- \`defaultValue\` (boolean): Default value (true/false)

## Date Field

Date-only field (without time).

\`\`\`typescript
.dateField('birthDate', 'Birth Date', {
  required: false,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (string): ISO date string

## DateTime Field

Date and time field.

\`\`\`typescript
.datetimeField('createdAt', 'Created At', {
  defaultValue: new Date().toISOString(),
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (string): ISO datetime string

## Email Field

Email address field with validation.

\`\`\`typescript
.emailField('email', 'Email', {
  required: true,
  unique: true,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`unique\` (boolean): Email must be unique

## Phone Field

Phone number field.

\`\`\`typescript
.phoneField('phone', 'Phone Number', {
  required: false,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required

## URL Field

Web URL field.

\`\`\`typescript
.urlField('website', 'Website', {
  required: false,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required

## Select Field

Single-choice dropdown field.

\`\`\`typescript
.selectField('status', 'Status', [
  { value: 'active', label: 'Active', color: '#22C55E' },
  { value: 'inactive', label: 'Inactive', color: '#EF4444' },
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
], {
  required: true,
  defaultValue: 'active',
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (string): Default option value
- Options array: Each option has \`value\`, \`label\`, and optional \`color\`

## Multi-Select Field

Multiple-choice field.

\`\`\`typescript
.multiselectField('tags', 'Tags', [
  { value: 'urgent', label: 'Urgent', color: '#EF4444' },
  { value: 'important', label: 'Important', color: '#F59E0B' },
], {
  defaultValue: [],
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (array): Default selected values
- Options array: Each option has \`value\`, \`label\`, and optional \`color\`

## Reference Field

Foreign key relationship to another entity.

\`\`\`typescript
.referenceField('customerId', 'Customer', 'other-module.customer', {
  required: true,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- Reference format: \`{module-id}.{entity-key}\`

## Location Field

Latitude/longitude location field.

\`\`\`typescript
.locationField('address', 'Location', {
  required: false,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- Stores: \`{ lat: number, lng: number }\`

## Currency Field

Money/numeric value for currency.

\`\`\`typescript
.currencyField('price', 'Price', {
  required: true,
  validation: { min: 0 },
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (number): Default value
- \`validation.min\` (number): Minimum value

## Percentage Field

0-100 percentage value displayed as progress bar.

\`\`\`typescript
.percentageField('completion', 'Completion', {
  defaultValue: 0,
  validation: { min: 0, max: 100 },
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (number): Default value (0-100)
- \`validation.min\` (number): Minimum value (0)
- \`validation.max\` (number): Maximum value (100)

## JSON Field

Structured JSON data field.

\`\`\`typescript
.jsonField('metadata', 'Metadata', {
  required: false,
})
\`\`\`

**Options:**
- \`required\` (boolean): Field is required
- \`defaultValue\` (object): Default JSON object

## Common Options

All field types support these common options:

- \`required\` (boolean): Field is required for validation
- \`unique\` (boolean): Field value must be unique across records
- \`defaultValue\` (any): Default value when creating new records
- \`validation\` (object): Validation rules specific to field type
- \`hidden\` (boolean): Hide field from UI (default: false)

## Field Selection Guidelines

- Use \`stringField\` for short text (< 255 chars)
- Use \`textField\` for long text/multiline
- Use \`numberField\` for integers, \`decimalField\` for decimals
- Use \`referenceField\` for relationships to other entities
- Use \`selectField\` for fixed options, \`multiselectField\` for multiple choices
- Use \`currencyField\` for money values
- Use \`percentageField\` for 0-100 percentages
- Use \`locationField\` for geographic coordinates
- Use \`jsonField\` for flexible structured data
`;
}
