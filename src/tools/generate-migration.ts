interface FieldChange {
  key: string;
  type: string;
  options?: Record<string, unknown>;
}

interface IndexChange {
  fields: string[];
  unique?: boolean;
}

interface MigrationChange {
  type: 'add_field' | 'remove_field' | 'add_index' | 'remove_index' | 'modify_field';
  entityKey: string;
  field?: FieldChange;
  index?: IndexChange;
}

interface GenerateMigrationArgs {
  migrationName: string;
  changes: MigrationChange[];
}

export async function generateMigration(args: GenerateMigrationArgs): Promise<string> {
  const { migrationName, changes } = args;

  // Validate migration name
  if (!/^[a-z0-9_]+$/.test(migrationName)) {
    throw new Error('Migration name must be snake_case (lowercase letters, numbers, and underscores)');
  }

  if (!changes || changes.length === 0) {
    throw new Error('At least one change is required');
  }

  // Generate version number based on current timestamp
  const now = new Date();
  const version = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  // Generate SQL for each change
  const upStatements: string[] = [];
  const downStatements: string[] = [];

  for (const change of changes) {
    const { type, entityKey, field, index } = change;

    switch (type) {
      case 'add_field':
        if (!field) throw new Error('Field definition required for add_field');
        upStatements.push(generateAddFieldSQL(entityKey, field));
        downStatements.push(generateRemoveFieldSQL(entityKey, field.key));
        break;

      case 'remove_field':
        if (!field) throw new Error('Field key required for remove_field');
        upStatements.push(generateRemoveFieldSQL(entityKey, field.key));
        downStatements.push(`-- Cannot auto-generate rollback for remove_field: ${field.key}`);
        break;

      case 'add_index':
        if (!index) throw new Error('Index definition required for add_index');
        upStatements.push(generateAddIndexSQL(entityKey, index));
        downStatements.push(generateRemoveIndexSQL(entityKey, index));
        break;

      case 'remove_index':
        if (!index) throw new Error('Index definition required for remove_index');
        upStatements.push(generateRemoveIndexSQL(entityKey, index));
        downStatements.push(`-- Cannot auto-generate rollback for remove_index`);
        break;

      case 'modify_field':
        if (!field) throw new Error('Field definition required for modify_field');
        upStatements.push(generateModifyFieldSQL(entityKey, field));
        downStatements.push(`-- Manual rollback required for modify_field: ${field.key}`);
        break;
    }
  }

  // Generate migration object
  const migrationCode = `{
  version: '${version}',
  name: '${migrationName}',
  up: \`
${upStatements.join('\n\n')}
  \`,
  down: \`
${downStatements.join('\n\n')}
  \`,
}`;

  return `# Migration Generated

## Migration Details

- **Version:** ${version}
- **Name:** ${migrationName}
- **Changes:** ${changes.length}

## Migration Code

Add this migration to \`apps/api/src/db/migrate.ts\`:

\`\`\`typescript
// Migration ${version}: ${migrationName}
${migrationCode}
\`\`\`

## Changes Summary

${changes.map((c, i) => `${i + 1}. **${c.type}** on \`${c.entityKey}\`${c.field ? `: ${c.field.key}` : ''}${c.index ? `: [${c.index.fields.join(', ')}]` : ''}`).join('\n')}

## Up Migration SQL

\`\`\`sql
${upStatements.join('\n\n')}
\`\`\`

## Down Migration SQL (Rollback)

\`\`\`sql
${downStatements.join('\n\n')}
\`\`\`

## Usage

After adding the migration to \`migrate.ts\`, run:

\`\`\`bash
# Run all pending migrations
npm run migrate -w @frameio/api

# Or with docker
docker-compose exec api npm run migrate
\`\`\`

## Important Notes

1. **JSONB Updates:** FrameIO stores entity data in a JSONB column, so field changes update the JSON schema metadata, not the actual table structure.

2. **Existing Data:** Migrations that add required fields should provide default values or update existing records.

3. **Testing:** Always test migrations on a copy of production data before deploying.

4. **Rollback:** The down migration is provided but should be tested carefully. Some operations may not be fully reversible.
`;
}

function generateAddFieldSQL(entityKey: string, field: FieldChange): string {
  const defaultValue = getDefaultValueSQL(field.type, field.options?.defaultValue);
  const isRequired = field.options?.required ? 'true' : 'false';

  return `-- Add field '${field.key}' to entity '${entityKey}'
-- Update metadata_entities to include new field
UPDATE metadata_entities
SET fields = fields || '[{
  "key": "${field.key}",
  "type": "${field.type}",
  "name": "${field.options?.name || field.key}",
  "required": ${isRequired}
}]'::jsonb
WHERE key = '${entityKey}';

-- Update existing records with default value (if any)
${defaultValue ? `UPDATE data_records
SET data = jsonb_set(data, '{${field.key}}', '${defaultValue}'::jsonb)
WHERE entity_key = '${entityKey}'
  AND NOT (data ? '${field.key}');` : `-- No default value specified for new field`}`;
}

function generateRemoveFieldSQL(entityKey: string, fieldKey: string): string {
  return `-- Remove field '${fieldKey}' from entity '${entityKey}'
-- Update metadata_entities to remove field
UPDATE metadata_entities
SET fields = (
  SELECT jsonb_agg(field)
  FROM jsonb_array_elements(fields) AS field
  WHERE field->>'key' != '${fieldKey}'
)
WHERE key = '${entityKey}';

-- Remove field from existing records
UPDATE data_records
SET data = data - '${fieldKey}'
WHERE entity_key = '${entityKey}';`;
}

function generateAddIndexSQL(entityKey: string, index: IndexChange): string {
  const indexName = `idx_${entityKey.replace('.', '_')}_${index.fields.join('_')}`;
  const uniqueStr = index.unique ? 'UNIQUE' : '';
  const indexFields = index.fields
    .map((f) => `(data->>'${f}')`)
    .join(', ');

  return `-- Add ${index.unique ? 'unique ' : ''}index on ${index.fields.join(', ')} for entity '${entityKey}'
CREATE ${uniqueStr} INDEX IF NOT EXISTS ${indexName}
ON data_records (${indexFields})
WHERE entity_key = '${entityKey}';`;
}

function generateRemoveIndexSQL(entityKey: string, index: IndexChange): string {
  const indexName = `idx_${entityKey.replace('.', '_')}_${index.fields.join('_')}`;
  return `-- Remove index on ${index.fields.join(', ')} for entity '${entityKey}'
DROP INDEX IF EXISTS ${indexName};`;
}

function generateModifyFieldSQL(entityKey: string, field: FieldChange): string {
  return `-- Modify field '${field.key}' in entity '${entityKey}'
-- Update metadata_entities field definition
UPDATE metadata_entities
SET fields = (
  SELECT jsonb_agg(
    CASE 
      WHEN field->>'key' = '${field.key}' THEN
        field || '{"type": "${field.type}"}'::jsonb
      ELSE field
    END
  )
  FROM jsonb_array_elements(fields) AS field
)
WHERE key = '${entityKey}';

-- Note: Data migration may be required if type change is incompatible
-- Add custom data transformation SQL here if needed`;
}

function getDefaultValueSQL(fieldType: string, defaultValue: unknown): string | null {
  if (defaultValue === undefined || defaultValue === null) {
    return null;
  }

  switch (fieldType) {
    case 'string':
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return `"${defaultValue}"`;
    case 'number':
    case 'decimal':
    case 'currency':
    case 'percentage':
      return String(defaultValue);
    case 'boolean':
      return String(defaultValue);
    case 'date':
    case 'datetime':
      return `"${defaultValue}"`;
    case 'json':
      return JSON.stringify(defaultValue);
    default:
      return `"${defaultValue}"`;
  }
}
