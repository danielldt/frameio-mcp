export function getValidationChecklist(args: {
  moduleId?: string;
}): { messages: Array<{ role: string; content: string }> } {
  const { moduleId } = args;

  const content = `# Module Validation Checklist

${moduleId ? `**Validating Module:** ${moduleId}` : 'Use this checklist to validate your FrameIO module before completion.'}

## Structure Validation

### File Structure
- [ ] \`package.json\` exists and is valid JSON
- [ ] \`src/index.ts\` exists
- [ ] \`tsconfig.json\` exists (recommended)
- [ ] Directory name matches module ID

### Package.json Checks
- [ ] \`name\` field is \`@frameio/${moduleId || 'module-id'}\`
- [ ] \`type\` field is \`"module"\`
- [ ] Dependencies include \`@frameio/sdk\` and \`@frameio/shared\`
- [ ] Scripts include \`build\` and optionally \`dev\`

## Code Validation

### Module Export
- [ ] Module exports \`${moduleId ? moduleId.replace(/-([a-z])/g, (_, l) => l.toUpperCase()) + 'Module' : '{camelCase}Module'}\` or \`default\`
- [ ] Export name follows \`{camelCaseModuleId}Module\` convention
- [ ] Module uses \`createModule()\` builder

### Entity Definitions
- [ ] All entities use \`defineEntity()\`
- [ ] Entity keys follow format \`{module-id}.{entity-name}\`
- [ ] Entity keys start with module ID
- [ ] Entity names use snake_case
- [ ] Each entity has:
  - [ ] \`name\` (singular)
  - [ ] \`pluralName\`
  - [ ] \`description\`
  - [ ] At least one field
  - [ ] Permissions defined
  - [ ] At least one view (table view minimum)

### Field Definitions
- [ ] All fields have \`key\` and \`name\`
- [ ] Field keys use camelCase
- [ ] Required fields marked with \`required: true\`
- [ ] Unique fields marked with \`unique: true\`
- [ ] Reference fields include \`refEntityKey\`
- [ ] Select fields include options array
- [ ] Validation rules are valid

### Permissions
- [ ] Permissions created using \`permission()\` function
- [ ] Permission IDs follow format \`{module-id}.{entity-key}.{action}\`
- [ ] Each entity has four basic permissions:
  - [ ] \`read\`
  - [ ] \`create\`
  - [ ] \`update\`
  - [ ] \`delete\`
- [ ] Permissions registered with \`registerPermissions()\`

## Navigation Validation

### Navigation Sections
- [ ] Navigation sections use \`navSection()\`
- [ ] Section keys are unique
- [ ] Sections have icon and order

### Navigation Items
- [ ] Navigation items use \`navItem()\`
- [ ] Items have unique keys
- [ ] Items reference valid entity keys or paths
- [ ] Items have appropriate permissions
- [ ] Items are registered with \`registerNavItems()\`

## Commands Validation

- [ ] Commands use \`command()\` function
- [ ] Command keys are unique
- [ ] Commands have proper type (\`action\`, \`module\`)
- [ ] Commands have valid paths
- [ ] Commands have appropriate permissions
- [ ] Commands have keywords for searchability
- [ ] Commands registered with \`registerCommands()\`

## Registry Validation

- [ ] Module added to \`modules/.registry.ts\`
- [ ] Registry entry format:
  \`\`\`typescript
  {
    moduleId: '${moduleId || 'module-id'}',
    importPath: '@frameio/${moduleId || 'module-id'}',
  }
  \`\`\`
- [ ] Module ID matches directory name
- [ ] Import path matches package.json name

## TypeScript Validation

- [ ] TypeScript compiles without errors
- [ ] No type errors in \`src/index.ts\`
- [ ] All imports resolve correctly
- [ ] No unused imports

## Best Practices Checklist

### Naming Conventions
- [ ] Module ID is kebab-case
- [ ] Entity keys follow \`{module-id}.{entity-name}\` format
- [ ] Entity names use snake_case
- [ ] Permission IDs follow convention
- [ ] Export name follows camelCase convention

### Code Organization
- [ ] Imports at top of file
- [ ] Entities defined before module registration
- [ ] Permissions array defined
- [ ] Navigation, commands, etc. organized logically
- [ ] Code is readable and well-commented

### Field Design
- [ ] Appropriate field types selected
- [ ] Required fields marked
- [ ] Default values set where appropriate
- [ ] Validation rules defined
- [ ] Reference fields point to valid entities

### View Configuration
- [ ] Table view includes important columns
- [ ] Kanban view configured if status-based
- [ ] Views are appropriate for entity type

## Runtime Validation

After building:

- [ ] Module loads without errors
- [ ] Entities appear in entity list
- [ ] Navigation items appear correctly
- [ ] Commands appear in command palette
- [ ] Permissions work correctly
- [ ] CRUD operations work
- [ ] Views render correctly

## Common Issues to Check

### Issue: Module not loading
- Check registry entry exists
- Verify package.json name matches importPath
- Check export name matches convention
- Verify TypeScript compiles

### Issue: Entity not appearing
- Check entity is registered
- Verify permissions are defined
- Check navigation items configured
- Verify entity key format

### Issue: Fields not showing
- Check field is added to entity
- Verify field is in table view columns
- Check field is not marked as hidden

### Issue: Navigation not appearing
- Check navigation items registered
- Verify permissions allow access
- Check section key matches

## Validation Tools

Use the \`validate_module\` tool to automatically check:
- Structure validation
- Export validation
- Conventions validation
- Registry validation

Example:
\`\`\`
validate_module({
  modulePath: "modules/${moduleId || 'my-module'}",
  strict: true
})
\`\`\`

## Next Steps After Validation

1. Fix any errors found
2. Address warnings
3. Test module functionality
4. Document any custom features
5. Consider adding tests (optional)
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
