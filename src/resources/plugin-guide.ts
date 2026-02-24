export function getPluginGuide(): string {
  return `# FrameIO Plugin Development Guide

## Overview

Plugins in FrameIO are **fully self-contained** extensions that can modify the UI, add backend API routes, 
manage their own database tables, and define permissions — all without touching core platform code.

## Plugin vs Module

| Feature | Module | Plugin |
|---------|--------|--------|
| Focus | Domain data & workflows | Platform extensions & integrations |
| UI Scope | Own pages & widgets | Can modify sidebar, header, login globally |
| Database | Platform-managed via entity metadata | Self-managed migrations with \`plugin_*\` prefix |
| Backend Routes | Generic data API | Custom Express routes via dynamic registration |
| Registry | \`modules/.registry.ts\` | \`plugins/.registry.ts\` |

## Plugin Directory Structure

\`\`\`
plugins/my-plugin/
├── package.json              # Plugin package configuration
├── tsconfig.json             # TypeScript configuration
├── tsconfig.build.json       # Build configuration (for backend compilation)
└── src/
    ├── index.ts              # Plugin definition & registration (REQUIRED)
    ├── migrations.ts         # Database migrations (optional)
    ├── routes.ts             # Backend API routes (optional)
    ├── components/           # React components
    │   ├── index.ts          # Component exports
    │   └── MyPluginPage.tsx  # Main page component
    └── types/                # TypeScript type definitions (optional)
\`\`\`

## Creating a Plugin

### Step 1: Create package.json

\`\`\`json
{
  "name": "@frameio/my-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components": "./src/components/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@frameio/sdk": "*",
    "@frameio/shared": "*",
    "lucide-react": "^0.294.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0"
  }
}
\`\`\`

### Step 2: Create tsconfig.json

\`\`\`json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
\`\`\`

### Step 3: Define Database Migrations (Optional)

\`\`\`typescript
// src/migrations.ts
import { definePluginMigration } from '@frameio/sdk';

export const myPluginMigrations = [
  definePluginMigration({
    pluginId: 'my-plugin',
    version: '1.0.0',
    description: 'Create initial tables',
    up: async (ctx) => {
      // ctx.sql() executes SQL against the database
      await ctx.sql(\\\`
        CREATE TABLE IF NOT EXISTS plugin_my_plugin_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      \\\`);
      await ctx.sql(\\\`
        CREATE INDEX IF NOT EXISTS idx_plugin_my_plugin_items_tenant 
        ON plugin_my_plugin_items(tenant_id)
      \\\`);
    },
    down: async (ctx) => {
      await ctx.sql('DROP TABLE IF EXISTS plugin_my_plugin_items CASCADE');
    },
  }),
];
\`\`\`

### Step 4: Define Backend Routes (Optional)

The platform loads \`routes.ts\` and calls **\`createRouter(deps)\`** (or the default export), passing **\`PluginApiDeps\`**. You must export a **route factory**, not \`registerRoutes(router)\`. Use \`deps.db.query\` or \`deps.db.getClient\` for database access. Import \`PluginApiDeps\` from \`@frameio/sdk\`.

\`\`\`typescript
// src/routes.ts
import type { PluginApiDeps } from '@frameio/sdk';

export function createRouter(deps: PluginApiDeps) {
  const router = deps.Router();
  const { db, Errors, requirePermission } = deps;

  // GET /api/v1/plugins/my-plugin/items
  router.get('/items', deps.authenticate, deps.requireTenant, requirePermission('my-plugin.read'), async (req: any, res: any) => {
    try {
      const tenantId = req.context?.tenantId;
      const result = await db.query('SELECT * FROM plugin_my_plugin_items WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
      res.json({ items: result.rows });
    } catch (err) {
      res.status(500).json({ error: deps.Errors.badRequest('Failed to fetch items').message });
    }
  });

  // POST /api/v1/plugins/my-plugin/items
  router.post('/items', deps.authenticate, deps.requireTenant, requirePermission('my-plugin.manage'), async (req: any, res: any) => {
    try {
      const tenantId = req.context?.tenantId;
      const { name, data } = req.body || {};
      await db.query(
        'INSERT INTO plugin_my_plugin_items (tenant_id, name, data) VALUES ($1, $2, $3)',
        [tenantId, name ?? '', JSON.stringify(data ?? {})]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: deps.Errors.badRequest('Failed to create item').message });
    }
  });

  return router;
}
\`\`\`

**Important:** Do **not** use \`registerRoutes(router: Router)\`. The platform expects \`createRouter\` (or default export) and injects \`deps\`; only this way can your plugin use \`deps.db\`, \`deps.Errors\`, and \`deps.registerWidgetDataProvider\` without importing from the API package.

### Step 5: Create Plugin Definition

\`\`\`typescript
// src/index.ts
import { createPlugin } from '@frameio/sdk';
import { myPluginMigrations } from './migrations.js';

export const myPlugin = createPlugin({
  id: 'my-plugin',
  version: '1.0.0',
  displayName: 'My Plugin',
  description: 'A custom plugin',
  icon: 'puzzle',
  author: 'Your Name',
})
  .registerMigrations(myPluginMigrations)
  .registerBackendRoute({
    path: 'my-plugin',
    requireAuth: true,
    requireTenant: true,
  })
  .registerPermissions([
    { key: 'read', name: 'View', description: 'View plugin data' },
    { key: 'manage', name: 'Manage', description: 'Full plugin access' },
  ])
  .registerSidebarItem({
    key: 'my-plugin-nav',
    label: 'My Plugin',
    icon: 'puzzle',
    path: '/plugins/my-plugin',
    permission: 'my-plugin.read',
    order: 100,
  })
  .registerRoute({
    path: '/',
    component: 'MyPluginPage',
    permission: 'my-plugin.read',
    index: true,
  })
  .registerCommand({
    key: 'open-my-plugin',
    label: 'Open My Plugin',
    description: 'Navigate to My Plugin',
    icon: 'puzzle',
    action: 'navigate',
    path: '/plugins/my-plugin',
    category: 'navigation',
    keywords: ['my', 'plugin'],
  })
  .build();

export default myPlugin;
\`\`\`

### Step 6: Create Components

\`\`\`typescript
// src/components/MyPluginPage.tsx
import React from 'react';

export function MyPluginPage() {
  return (
    <div className="p-6">
      <h1 style={{ color: 'var(--theme-text-primary)' }}>My Plugin</h1>
    </div>
  );
}

// src/components/index.ts
export { MyPluginPage } from './MyPluginPage.js';
\`\`\`

### Step 7: Register the Plugin

Add to \`plugins/.registry.ts\`:

\`\`\`typescript
{ pluginId: 'my-plugin', importPath: '../../plugins/my-plugin/src' },
\`\`\`

## Table Naming Convention

All plugin tables MUST follow:
\`\`\`
plugin_{plugin_id}_{table_name}
\`\`\`

Examples:
- \`plugin_oauth_providers\` — OAuth plugin's providers table
- \`plugin_integration_tokens\` — Integration plugin's tokens table
- \`plugin_data_orchestrator_flows\` — Data Orchestrator's flows table

## Migration Context API

The \`ctx\` object in migration functions provides:
- \`ctx.sql(query, params?)\` — Execute SQL queries
- \`ctx.tenantId\` — Current tenant ID
- \`ctx.pluginId\` — Plugin ID

## Route Registration Options

\`\`\`typescript
.registerBackendRoute({
  path: 'my-plugin',     // Mounted at /api/v1/plugins/my-plugin/
  requireAuth: true,     // Apply authenticate middleware
  requireTenant: true,   // Apply requireTenant middleware
})
\`\`\`

## Custom Widget Data (Plugins Only)

Dashboard widgets that need **server-side data** must be supplied by **plugins** via \`deps.registerWidgetDataProvider\`. Core does not define domain-specific widget data; only plugins register providers.

In \`createRouter(deps)\`, call:

\`\`\`typescript
deps.registerWidgetDataProvider('my-plugin.my-widget', async (tenantId, widget, props, filters) => {
  const result = await deps.db.query(
    'SELECT COUNT(*) AS total FROM plugin_my_plugin_items WHERE tenant_id = $1',
    [tenantId]
  );
  return { total: result.rows[0]?.total ?? 0 };
});
\`\`\`

Provider signature: \`(tenantId: string, widget: WidgetMetadata, props: Record<string, unknown>, filters?: Record<string, unknown>) => Promise<unknown>\`. Register only widget keys that your plugin owns (e.g. \`my-plugin.dashboard-stat\`).

## Plugin Builder API

| Method | Description |
|--------|-------------|
| \`registerMigrations(migrations)\` | Register database migrations |
| \`registerBackendRoute(config)\` | Register backend API routes |
| \`registerPermissions(permissions)\` | Define plugin-specific permissions |
| \`registerSidebarItem(item)\` | Add item to the sidebar |
| \`registerRoute(route)\` | Register frontend page route |
| \`registerCommand(command)\` | Add command palette entry |
| \`registerHeaderAction(action)\` | Add action to the header bar |
| \`registerBottomNavItem(item)\` | Add item to mobile bottom nav |
| \`registerLoginComponent(component)\` | Extend the login page |
| \`.build()\` | Finalize and register the plugin |

## Plugin Removal

When removing a plugin:
\`\`\`bash
# Disable only (keep data)
DELETE /api/v1/plugins/my-plugin

# Drop all database tables
DELETE /api/v1/plugins/my-plugin?cleanup=true

# Drop tables + remove migration history
DELETE /api/v1/plugins/my-plugin?cleanup=true&removeMigrationHistory=true
\`\`\`

## What Happens Automatically

When the platform starts:
1. Discovers plugins from \`plugins/.registry.ts\`
2. Runs pending database migrations
3. Registers backend API routes at \`/api/v1/plugins/{plugin-id}/\`
4. Loads frontend components and registers UI elements
5. No core platform code changes needed!

## Best Practices

1. **Always define \`down\` migrations** — Essential for clean plugin removal
2. **Use the table naming convention** — Prevents collisions between plugins
3. **Use CSS variables for theming** — \`var(--theme-text-primary)\` etc.
4. **Define granular permissions** — Allow admins to control access precisely
5. **Keep plugins self-contained** — Never import from other plugins
6. **Export \`createRouter(deps: PluginApiDeps)\` from routes.ts** — The platform calls this and injects \`deps\`; do not use \`registerRoutes(router)\`
7. **Import \`PluginApiDeps\` from \`@frameio/sdk\`** — So backend route code builds against the same contract the API uses
8. **Use \`tsconfig.build.json\`** — For backend compilation to \`dist/\`; type route handlers explicitly (no implicit \`any\`)
`;
}
