interface GeneratePluginMigrationArgs {
  pluginId: string;
  version: string;
  description: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      defaultValue?: string;
      primaryKey?: boolean;
    }>;
    indexes?: Array<{
      columns: string[];
      unique?: boolean;
    }>;
  }>;
}

export async function generatePluginMigration(
  args: GeneratePluginMigrationArgs
): Promise<string> {
  const { pluginId, version, description, tables } = args;
  const tablePrefix = `plugin_${pluginId.replace(/-/g, "_")}`;
  const camelId = pluginId.replace(/-([a-z])/g, (_, l: string) =>
    l.toUpperCase()
  );

  const upStatements: string[] = [];
  const downStatements: string[] = [];

  for (const table of tables) {
    const fullTableName = `${tablePrefix}_${table.name}`;

    // Build columns
    const columns: string[] = [];
    const hasPrimaryKey = table.columns.some((c) => c.primaryKey);

    if (!hasPrimaryKey) {
      columns.push("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    }

    // Always include tenant_id
    const hasTenantId = table.columns.some((c) => c.name === "tenant_id");
    if (!hasTenantId) {
      columns.push("tenant_id VARCHAR(255) NOT NULL");
    }

    for (const col of table.columns) {
      let def = `${col.name} ${col.type}`;
      if (col.primaryKey) def += " PRIMARY KEY";
      if (!col.nullable && !col.primaryKey) def += " NOT NULL";
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      columns.push(def);
    }

    // Always include timestamps
    const hasCreatedAt = table.columns.some((c) => c.name === "created_at");
    const hasUpdatedAt = table.columns.some((c) => c.name === "updated_at");
    if (!hasCreatedAt) columns.push("created_at TIMESTAMPTZ DEFAULT NOW()");
    if (!hasUpdatedAt) columns.push("updated_at TIMESTAMPTZ DEFAULT NOW()");

    const columnsSQL = columns.join(",\n          ");

    upStatements.push(`      await ctx.sql(\`
        CREATE TABLE IF NOT EXISTS ${fullTableName} (
          ${columnsSQL}
        )
      \`);`);

    // Default tenant index
    upStatements.push(`      await ctx.sql(\`
        CREATE INDEX IF NOT EXISTS idx_${fullTableName}_tenant 
        ON ${fullTableName}(tenant_id)
      \`);`);

    // Additional indexes
    if (table.indexes) {
      for (const idx of table.indexes) {
        const indexName = `idx_${fullTableName}_${idx.columns.join("_")}`;
        const uniqueStr = idx.unique ? "UNIQUE " : "";
        upStatements.push(`      await ctx.sql(\`
        CREATE ${uniqueStr}INDEX IF NOT EXISTS ${indexName} 
        ON ${fullTableName}(${idx.columns.join(", ")})
      \`);`);
      }
    }

    downStatements.push(
      `      await ctx.sql('DROP TABLE IF EXISTS ${fullTableName} CASCADE');`
    );
  }

  const code = `import { definePluginMigration } from '@frameio/sdk';

// Add this to your plugin's migrations array
definePluginMigration({
  pluginId: '${pluginId}',
  version: '${version}',
  description: '${description}',
  up: async (ctx) => {
${upStatements.join("\n")}
  },
  down: async (ctx) => {
${downStatements.join("\n")}
  },
})`;

  return `# Generated Plugin Migration

## Migration for ${pluginId} v${version}

### Description
${description}

### Tables Created
${tables.map((t) => `- \`${tablePrefix}_${t.name}\``).join("\n")}

### Code

\`\`\`typescript
${code}
\`\`\`

### Usage

Add this migration to your plugin's \`src/migrations.ts\`:

\`\`\`typescript
import { definePluginMigration } from '@frameio/sdk';

export const ${camelId}Migrations = [
  // ... existing migrations ...
  ${code.replace(
    "import { definePluginMigration } from '@frameio/sdk';\n\n// Add this to your plugin's migrations array\n",
    ""
  )}
];
\`\`\`

Then register in \`src/index.ts\`:
\`\`\`typescript
.registerMigrations(${camelId}Migrations)
\`\`\`

### Table Naming Convention
All tables follow the convention: \`plugin_{plugin_id}_{table_name}\`
- Plugin ID: \`${pluginId}\` → Prefix: \`${tablePrefix}_\`
`;
}
