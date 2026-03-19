export function getPluginCreationGuide(args: {
  pluginId?: string;
  displayName?: string;
  description?: string;
}): { messages: Array<{ role: string; content: string }> } {
  const { pluginId, displayName, description } = args;

  const content = `# FrameIO Plugin Creation Guide

Follow these steps to create a new FrameIO plugin. Plugins are **fully self-contained** — 
they manage their own database tables, backend routes, and frontend UI without touching core platform code.

## Step 1: Planning

${
  pluginId
    ? `**Plugin ID:** ${pluginId}`
    : "1. Choose a plugin ID (kebab-case, e.g., my-plugin)"
}
${
  displayName
    ? `**Display Name:** ${displayName}`
    : "2. Choose a display name (e.g., My Plugin)"
}
${
  description
    ? `**Description:** ${description}`
    : "3. Write a brief description"
}

### Plugin ID Guidelines
- Use kebab-case: lowercase letters, numbers, and hyphens
- Be descriptive: \`notifications\`, \`analytics\`, \`audit-trail\`
- Keep it concise: 1-3 words maximum

### Key Decision: Does this need a Module or a Plugin?
- **Module**: Domain-specific data (products, orders, customers) with CRUD views
- **Plugin**: Platform extensions (authentication, integrations, monitoring, automation)

## Step 2: Create Plugin Structure

Create the following directory structure:

\`\`\`
plugins/${pluginId || "my-plugin"}/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── src/
    ├── index.ts              # Plugin definition (REQUIRED)
    ├── migrations.ts         # Database migrations (if needed)
    ├── routes.ts             # Backend API routes (if needed)
    └── components/
        ├── index.ts          # Component exports
        └── MainPage.tsx      # Main plugin page
\`\`\`

## Step 3: Define Database Tables (if needed)

For each table you need:

1. **Table Name**: Must follow \`plugin_{plugin-id}_{table-name}\` convention
   - Example: \`plugin_${(pluginId || "my-plugin").replace(/-/g, "_")}_items\`

2. **Always include**: \`id\` (UUID), \`tenant_id\`, \`created_at\`, \`updated_at\`

3. **Define migrations** using \`definePluginMigration()\`:
   - \`up\` function: Creates tables/indexes
   - \`down\` function: Drops tables (used when removing the plugin)

4. **Version your migrations**: Use semantic versioning (1.0.0, 1.1.0, etc.)

## Step 4: Define Backend Routes (if needed)

1. Create \`src/routes.ts\` exporting **\`createRouter(deps: PluginApiDeps)\`** (not \`registerRoutes(router)\`). The platform calls \`createRouter(deps)\` and injects \`deps\` (db, Router, Errors, requirePermission, etc.).
2. Import \`PluginApiDeps\` from \`@frameio/sdk\`. Use \`deps.db.query\` or \`deps.db.getClient\` for database access.
3. Routes are mounted at \`/api/v1/plugins/${pluginId || "my-plugin"}/\`. Use \`deps.authenticate\`, \`deps.requireTenant\`, \`deps.requirePermission('plugin-id.read')\` as middleware.
4. For custom dashboard widget data, call \`deps.registerWidgetDataProvider(widgetKey, provider)\` inside \`createRouter(deps)\`.
5. Reference \`frameio://architecture\` and \`frameio://plugin-guide\` for the full contract.

## Step 5: Create Plugin Definition

In \`src/index.ts\`:

1. Import \`createPlugin\` from \`@frameio/sdk\`
2. Import migrations (if any)
3. Chain builder methods:
   - \`.registerMigrations()\` — Database tables
   - \`.registerBackendRoute()\` — Backend API
   - \`.registerPermissions()\` — Access control
   - \`.registerSidebarItem()\` — Sidebar navigation
   - \`.registerRoute()\` — Frontend page routes
   - \`.registerCommand()\` — Command palette entries
4. Call \`.build()\` to finalize

## Step 6: Create Frontend Components

1. Create page components in \`src/components/\`
2. Use CSS variables for theming: \`var(--theme-text-primary)\`, \`var(--theme-bg-secondary)\`
3. Export all components from \`src/components/index.ts\`

## Step 7: Register the Plugin

Add to \`plugins/.registry.ts\`:
\`\`\`typescript
{ pluginId: '${pluginId || "my-plugin"}', importPath: '../../plugins/${
    pluginId || "my-plugin"
  }/src' },
\`\`\`

## Step 8: Build and Test

1. Run \`npm install\` to install dependencies
2. Run \`docker-compose up --build\` to rebuild and start
3. Verify:
   - Database tables are created
   - API routes respond
   - Plugin appears in sidebar
   - Plugin page loads correctly
   - Commands appear in command palette (Ctrl+K)

## Important Rules

- **Table naming**: ALL tables must be prefixed with \`plugin_${(
    pluginId || "my-plugin"
  ).replace(/-/g, "_")}_\`
- **Always define \`down\` migrations**: Required for clean plugin removal
- **Export \`createRouter(deps: PluginApiDeps)\` from routes.ts**: The platform calls this and injects \`deps\`; do not use \`registerRoutes(router)\`
- **Background workers**: If the plugin needs scheduled jobs, event handlers, or escalation logic, export \`startBackgroundWorkers(deps: PluginApiDeps): void\` from routes.ts (use \`includeBackgroundWorkers: true\` in generate_plugin)
- **Import PluginApiDeps from \`@frameio/sdk\`**: Required for correct build contract
- **Never modify core platform code**: Your plugin should be fully self-contained
- **Use \`tsconfig.build.json\`**: For compiling routes to \`dist/\`

## Available Tools and Resources

1. Use the \`generate_plugin\` tool to scaffold the entire plugin (generates \`createRouter(deps)\` in routes.ts)
2. Use the \`generate_plugin_migration\` tool for additional migrations
3. Use the \`validate_plugin\` tool to check structure, route contract, and build contract
4. Read \`frameio://architecture\` for design philosophy and platform architecture
5. Reference \`frameio://plugin-guide\` for detailed documentation
`;

  return {
    messages: [
      {
        role: "user",
        content,
      },
    ],
  };
}
