export function getModuleCreationGuide(args: {
  moduleId?: string;
  displayName?: string;
  description?: string;
}): { messages: Array<{ role: string; content: string }> } {
  const { moduleId, displayName, description } = args;

  const content = `# FrameIO Module Creation Guide

Follow these steps to create a new FrameIO module. For design philosophy and platform rules (modules vs plugins, no domain in core), read the \`frameio://architecture\` resource.

## Step 1: Planning

${moduleId ? `**Module ID:** ${moduleId}` : '1. Choose a module ID (kebab-case, e.g., my-module)'}
${displayName ? `**Display Name:** ${displayName}` : '2. Choose a display name (e.g., My Module)'}
${description ? `**Description:** ${description}` : '3. Write a brief description'}

### Module ID Guidelines
- Use kebab-case: lowercase letters, numbers, and hyphens
- Be descriptive: \`pos-bom\`, \`module-rewards\`, \`inventory-management\`
- Keep it concise: 2-4 words maximum

## Step 2: Create Module Structure

Create the following directory structure:

\`\`\`
modules/${moduleId || 'my-module'}/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── pages/        (optional)
    └── sidebars/     (optional)
\`\`\`

## Step 3: Define Entities

For each entity you need:

1. **Entity Key**: Format \`${moduleId || 'my-module'}.{entity-name}\`
   - Use snake_case for entity name
   - Example: \`${moduleId || 'my-module'}.product\`

2. **Entity Properties**:
   - Name (singular): "Product"
   - Plural Name: "Products"
   - Description: Brief description
   - Icon: Lucide icon name (optional)

3. **Fields**: Define fields using appropriate field types
   - Required fields: Mark with \`required: true\`
   - Default values: Set where appropriate
   - Validation: Add min/max, patterns, etc.

4. **Permissions**: Define CRUD permissions
   - \`read\`, \`create\`, \`update\`, \`delete\`

5. **Views**: Configure at least a table view
   - Table view: List columns to display
   - Kanban view: If status-based workflow
   - Other views as needed

## Step 4: Register Module Components

In \`src/index.ts\`:

1. Import required functions from \`@frameio/sdk\`
2. Define entities using \`defineEntity()\`
3. Create permissions array using \`permission()\`
4. Create navigation (sections and items)
5. Create commands for command palette
6. Create stat cards (optional)
7. Create quick links (optional)
8. Build and export module using \`createModule()\`

## Step 5: Module Registration

**Option A: Use FrameIO CLI (Recommended)**
The CLI automatically adds modules to the registry:
\`\`\`bash
npx @frameio/cli create-module ${moduleId || 'my-module'}
\`\`\`

**Option B: Manual Registration**
Add to \`modules/.registry.ts\`:
\`\`\`typescript
export const registeredModules = [
  // ... existing modules
  {
    moduleId: '${moduleId || 'my-module'}',
    importPath: '@frameio/${moduleId || 'my-module'}',
  },
] as const;
\`\`\`

## Step 6: Build and Test

1. Run \`npm install\` in module directory
2. Run \`npm run build\` to compile
3. **Restart Docker Compose** (\`docker-compose restart\`) or development servers
4. Verify module loads without errors
5. Test entity CRUD operations
6. Verify navigation appears correctly
7. Test command palette entries

**Note:** Modules are dynamically loaded. After creating a module, restart the platform to see it.

## Common Patterns

### Basic Entity Example

\`\`\`typescript
const productEntity = defineEntity('${moduleId || 'my-module'}.product')
  .name('Product')
  .pluralName('Products')
  .description('Product catalog items')
  .icon('package')
  .stringField('name', 'Name', { required: true })
  .numberField('price', 'Price', { required: true, validation: { min: 0 } })
  .selectField('status', 'Status', [
    { value: 'active', label: 'Active', color: '#22C55E' },
    { value: 'inactive', label: 'Inactive', color: '#EF4444' },
  ], { defaultValue: 'active' })
  .permissions({
    read: '${moduleId || 'my-module'}.product.read',
    create: '${moduleId || 'my-module'}.product.create',
    update: '${moduleId || 'my-module'}.product.update',
    delete: '${moduleId || 'my-module'}.product.delete',
  })
  .tableView(['name', 'price', 'status'])
  .build();
\`\`\`

### Module Registration Example

\`\`\`typescript
export const ${moduleId ? moduleId.replace(/-([a-z])/g, (_, l) => l.toUpperCase()) : 'my'}Module = createModule({
  id: '${moduleId || 'my-module'}',
  version: '1.0.0',
  displayName: '${displayName || 'My Module'}',
  description: '${description || 'Module description'}',
  icon: 'package',
})
  .registerPermissions(permissions)
  .registerEntities([productEntity])
  .registerNavSection(navSection)
  .registerNavItems(navItems)
  .registerCommands(commands)
  .build();
\`\`\`

## Validation Checklist

Before completing, verify:

- [ ] Module ID is kebab-case
- [ ] Export name follows \`{camelCase}Module\` convention
- [ ] Entity keys follow \`{module-id}.{entity-name}\` format
- [ ] All entities have permissions defined
- [ ] Navigation items configured
- [ ] Registry entry added (or use CLI which does this automatically)
- [ ] TypeScript compiles without errors
- [ ] Module appears after restarting Docker Compose or dev servers

## Next Steps

1. Use the \`generate_module\` tool to scaffold the module
2. Use the \`generate_entity\` tool for each entity
3. Use the \`validate_module\` tool to check your work
4. Reference \`frameio://framework-guide\` for detailed documentation
5. Check \`frameio://examples\` for real-world examples
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
