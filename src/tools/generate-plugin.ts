interface GeneratePluginArgs {
  pluginId: string;
  displayName: string;
  description: string;
  author?: string;
  includeMigrations?: boolean;
  includeRoutes?: boolean;
  includeBackgroundWorkers?: boolean;
  tables?: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      defaultValue?: string;
    }>;
  }>;
  permissions?: Array<{
    key: string;
    name: string;
    description: string;
  }>;
}

export async function generatePlugin(
  args: GeneratePluginArgs
): Promise<string> {
  const {
    pluginId,
    displayName,
    description,
    author = "FrameIO Developer",
    includeMigrations = true,
    includeRoutes = true,
    includeBackgroundWorkers = false,
    tables = [],
    permissions = [
      { key: "read", name: "View", description: `View ${displayName} data` },
      {
        key: "manage",
        name: "Manage",
        description: `Full ${displayName} access`,
      },
    ],
  } = args;

  const camelId = pluginId.replace(/-([a-z])/g, (_, l: string) =>
    l.toUpperCase()
  );
  const pascalId = camelId.charAt(0).toUpperCase() + camelId.slice(1);
  const tablePrefix = `plugin_${pluginId.replace(/-/g, "_")}`;

  // Generate package.json
  const packageJson = JSON.stringify(
    {
      name: `@frameio/${pluginId}`,
      version: "1.0.0",
      type: "module",
      main: "./src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": "./src/index.ts",
        "./components": "./src/components/index.ts",
      },
      scripts: {
        build: "tsc",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@frameio/sdk": "*",
        "@frameio/shared": "*",
        "lucide-react": "^0.294.0",
      },
      peerDependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        "react-router-dom": "^6.0.0",
      },
    },
    null,
    2
  );

  // Generate tsconfig.json
  const tsconfig = JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
        declaration: true,
        declarationMap: true,
        jsx: "react-jsx",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        skipLibCheck: true,
      },
      include: ["src/**/*"],
    },
    null,
    2
  );

  // Generate tsconfig.build.json (for backend compilation)
  const tsconfigBuild = JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
        declaration: true,
        jsx: "react-jsx",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        skipLibCheck: true,
      },
      include: ["src/**/*"],
    },
    null,
    2
  );

  // Generate migrations.ts
  let migrationsCode = "";
  if (includeMigrations) {
    const tableCreations =
      tables.length > 0
        ? tables
            .map((table) => {
              const fullTableName = `${tablePrefix}_${table.name}`;
              const columnsSQL = [
                "id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
                "tenant_id VARCHAR(255) NOT NULL",
                ...table.columns.map((col) => {
                  let def = `${col.name} ${col.type}`;
                  if (!col.nullable) def += " NOT NULL";
                  if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
                  return def;
                }),
                "created_at TIMESTAMPTZ DEFAULT NOW()",
                "updated_at TIMESTAMPTZ DEFAULT NOW()",
              ].join(",\n          ");

              return `      await ctx.sql(\`
        CREATE TABLE IF NOT EXISTS ${fullTableName} (
          ${columnsSQL}
        )
      \`);
      await ctx.sql(\`
        CREATE INDEX IF NOT EXISTS idx_${fullTableName}_tenant 
        ON ${fullTableName}(tenant_id)
      \`);`;
            })
            .join("\n")
        : `      await ctx.sql(\`
        CREATE TABLE IF NOT EXISTS ${tablePrefix}_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      \`);
      await ctx.sql(\`
        CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_items_tenant 
        ON ${tablePrefix}_items(tenant_id)
      \`);`;

    const dropStatements =
      tables.length > 0
        ? tables
            .map((table) => {
              const fullTableName = `${tablePrefix}_${table.name}`;
              return `      await ctx.sql('DROP TABLE IF EXISTS ${fullTableName} CASCADE');`;
            })
            .join("\n")
        : `      await ctx.sql('DROP TABLE IF EXISTS ${tablePrefix}_items CASCADE');`;

    migrationsCode = `// plugins/${pluginId}/src/migrations.ts
import { definePluginMigration } from '@frameio/sdk';

export const ${camelId}Migrations = [
  definePluginMigration({
    pluginId: '${pluginId}',
    version: '1.0.0',
    description: 'Create initial ${displayName} tables',
    up: async (ctx) => {
${tableCreations}
    },
    down: async (ctx) => {
${dropStatements}
    },
  }),
];
`;
  }

  // Generate routes.ts (createRouter(deps) contract; PluginApiDeps from @frameio/sdk)
  let routesCode = "";
  if (includeRoutes || includeBackgroundWorkers) {
    const mainTable =
      tables.length > 0
        ? `${tablePrefix}_${tables[0].name}`
        : `${tablePrefix}_items`;
    const createRouterBlock = includeRoutes
      ? `export function createRouter(deps: PluginApiDeps) {
  const router = deps.Router();
  const { db, Errors, requirePermission } = deps;

  // GET /api/v1/plugins/${pluginId}/items
  router.get('/items', deps.authenticate, deps.requireTenant, requirePermission('${pluginId}.read'), async (req: any, res: any) => {
    try {
      const tenantId = req.context?.tenantId;
      const result = await db.query(
        'SELECT * FROM ${mainTable} WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );
      res.json({ items: result.rows });
    } catch (err) {
      res.status(500).json({ error: deps.Errors.badRequest('Failed to fetch items').message });
    }
  });

  // POST /api/v1/plugins/${pluginId}/items
  router.post('/items', deps.authenticate, deps.requireTenant, requirePermission('${pluginId}.manage'), async (req: any, res: any) => {
    try {
      const tenantId = req.context?.tenantId;
      const { name, data } = req.body || {};
      await db.query(
        'INSERT INTO ${mainTable} (tenant_id, name, data) VALUES ($1, $2, $3)',
        [tenantId, name ?? '', JSON.stringify(data ?? {})]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: deps.Errors.badRequest('Failed to create item').message });
    }
  });

  return router;
}
`
      : includeBackgroundWorkers
        ? `export function createRouter(deps: PluginApiDeps) {
  return deps.Router(); // No HTTP routes; plugin uses background workers only
}
`
        : "";
    const startBackgroundWorkersBlock = includeBackgroundWorkers
      ? `
export function startBackgroundWorkers(deps: PluginApiDeps): void {
  // TODO: Start your scheduled jobs, event handlers, or escalation runners here
  // Example: startScheduler(deps); startEventHandler(deps);
}
`
      : "";
    routesCode = `// plugins/${pluginId}/src/routes.ts
import type { PluginApiDeps } from '@frameio/sdk';
${createRouterBlock}${startBackgroundWorkersBlock}
`;
  }

  // Generate index.ts
  const permissionsCode = permissions
    .map(
      (p) =>
        `    { key: '${p.key}', name: '${p.name}', description: '${p.description}' },`
    )
    .join("\n");

  const indexCode = `// plugins/${pluginId}/src/index.ts
import { createPlugin } from '@frameio/sdk';
${
  includeMigrations
    ? `import { ${camelId}Migrations } from './migrations.js';`
    : ""
}

export const ${camelId}Plugin = createPlugin({
  id: '${pluginId}',
  version: '1.0.0',
  displayName: '${displayName}',
  description: '${description}',
  icon: 'puzzle',
  author: '${author}',
})
${includeMigrations ? `  .registerMigrations(${camelId}Migrations)` : ""}
${
  includeRoutes || includeBackgroundWorkers
    ? `  .registerBackendRoute({
    path: '${pluginId}',
    requireAuth: true,
    requireTenant: true,
  })`
    : ""
}
  .registerPermissions([
${permissionsCode}
  ])
  .registerSidebarItem({
    key: '${pluginId}-nav',
    label: '${displayName}',
    icon: 'puzzle',
    path: '/plugins/${pluginId}',
    permission: '${pluginId}.read',
    order: 100,
  })
  .registerRoute({
    path: '/',
    component: '${pascalId}Page',
    permission: '${pluginId}.read',
    index: true,
  })
  .registerCommand({
    key: 'open-${pluginId}',
    label: 'Open ${displayName}',
    description: 'Navigate to ${displayName}',
    icon: 'puzzle',
    action: 'navigate',
    path: '/plugins/${pluginId}',
    category: 'navigation',
    keywords: ['${pluginId.replace(/-/g, "', '")}'],
  })
  .build();

export default ${camelId}Plugin;
`;

  // Generate main page component
  const pageComponent = `// plugins/${pluginId}/src/components/${pascalId}Page.tsx
import React from 'react';

export function ${pascalId}Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4"
          style={{ color: 'var(--theme-text-primary)' }}>
        ${displayName}
      </h1>
      <p style={{ color: 'var(--theme-text-secondary)' }}>
        ${description}
      </p>
    </div>
  );
}
`;

  // Generate components/index.ts
  const componentsIndex = `// plugins/${pluginId}/src/components/index.ts
export { ${pascalId}Page } from './${pascalId}Page.js';
`;

  // Assemble output
  let output = `# Generated Plugin: ${displayName}

## Directory Structure
\`\`\`
plugins/${pluginId}/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── src/
    ├── index.ts${includeMigrations ? "\n    ├── migrations.ts" : ""}${
    includeRoutes || includeBackgroundWorkers ? "\n    ├── routes.ts" : ""
  }
    └── components/
        ├── index.ts
        └── ${pascalId}Page.tsx
\`\`\`

## Files

### package.json
\`\`\`json
${packageJson}
\`\`\`

### tsconfig.json
\`\`\`json
${tsconfig}
\`\`\`

### tsconfig.build.json
\`\`\`json
${tsconfigBuild}
\`\`\`

### src/index.ts
\`\`\`typescript
${indexCode}
\`\`\`
`;

  if (includeMigrations) {
    output += `
### src/migrations.ts
\`\`\`typescript
${migrationsCode}
\`\`\`
`;
  }

  if (includeRoutes || includeBackgroundWorkers) {
    output += `
### src/routes.ts
\`\`\`typescript
${routesCode}
\`\`\`
`;
  }

  output += `
### src/components/${pascalId}Page.tsx
\`\`\`typescript
${pageComponent}
\`\`\`

### src/components/index.ts
\`\`\`typescript
${componentsIndex}
\`\`\`

## Registry Entry
Add to \`plugins/.registry.ts\`:
\`\`\`typescript
{ pluginId: '${pluginId}', importPath: '../../plugins/${pluginId}/src' },
\`\`\`

## Table Naming Convention
All tables use the prefix \`${tablePrefix}_\`:
${
  tables.length > 0
    ? tables.map((t) => `- \`${tablePrefix}_${t.name}\``).join("\n")
    : `- \`${tablePrefix}_items\``
}

## What Happens Automatically
1. **Database**: Migrations run at startup, creating \`${tablePrefix}_*\` tables
2. **Routes**: API endpoints mounted at \`/api/v1/plugins/${pluginId}/\`
3. **UI**: Sidebar item, command palette entry, and page route registered
4. **Permissions**: \`${pluginId}.read\` and \`${pluginId}.manage\` available in role configuration${
  includeBackgroundWorkers
    ? `
5. **Background workers**: \`startBackgroundWorkers(deps)\` called by platform or runner (set \`RUNNER_MODE\` for embedded/standalone)`
    : ""
}
`;

  return output;
}
