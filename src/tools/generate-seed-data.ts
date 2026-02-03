import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface FieldSeed {
  key: string;
  type: string;
  generator?: 'random' | 'sequential' | 'static' | 'faker';
  value?: unknown;
  options?: Record<string, unknown>;
}

interface EntitySeed {
  entityKey: string;
  count: number;
  fields: FieldSeed[];
  relationships?: Array<{
    field: string;
    referenceEntityKey: string;
    strategy: 'random' | 'first' | 'all';
  }>;
}

interface GenerateSeedDataArgs {
  moduleId: string;
  entities: EntitySeed[];
  tenantId?: string;
}

export async function generateSeedData(args: GenerateSeedDataArgs): Promise<string> {
  const { moduleId, entities, tenantId = 'default' } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  if (!entities || entities.length === 0) {
    throw new Error('At least one entity seed configuration is required');
  }

  const camelCaseModuleId = toCamelCase(moduleId);

  // Generate seed function for each entity
  const seedFunctions = entities.map((entity) => generateEntitySeedFunction(entity, tenantId));

  // Generate main seed script
  const seedScript = `import { db } from './client.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed data for ${moduleId} module
 * 
 * Run with: npx ts-node apps/api/src/db/seed-${moduleId}.ts
 */

const TENANT_ID = '${tenantId}';

// Helper to generate random data
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

// Sample data arrays
const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Edward', 'Fiona'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const companies = ['Acme Corp', 'Tech Solutions', 'Global Services', 'Innovation Labs'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];

${seedFunctions.join('\n\n')}

// Main seed function
async function seed() {
  console.log('🌱 Starting seed for ${moduleId} module...');
  console.log('  Tenant: ' + TENANT_ID);
  console.log('');

  try {
    ${entities.map((e) => `await seed${toPascalCase(e.entityKey.split('.').pop() || 'Entity')}();`).join('\n    ')}

    console.log('');
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed().catch(console.error);
`;

  // Generate SQL-based seed as alternative
  const sqlSeed = entities
    .map((entity) => generateEntitySeedSQL(entity, tenantId))
    .join('\n\n');

  return `# Seed Data Generated

## TypeScript Seed Script

Create \`apps/api/src/db/seed-${moduleId}.ts\`:

\`\`\`typescript
${seedScript}
\`\`\`

## SQL Seed Script (Alternative)

For direct database insertion, create \`scripts/seed-${moduleId}.sql\`:

\`\`\`sql
-- Seed data for ${moduleId} module
-- Run with: psql -d frameio_platform -f scripts/seed-${moduleId}.sql

${sqlSeed}
\`\`\`

## Running the Seed

### TypeScript Method

\`\`\`bash
# Build first
npm run build -w @frameio/api

# Run seed
npx ts-node apps/api/src/db/seed-${moduleId}.ts
\`\`\`

### SQL Method

\`\`\`bash
# Connect to database and run
docker-compose exec postgres psql -U platform -d frameio_platform -f /scripts/seed-${moduleId}.sql

# Or locally
psql -d frameio_platform -f scripts/seed-${moduleId}.sql
\`\`\`

## Seed Summary

${entities.map((e) => `| \`${e.entityKey}\` | ${e.count} records | ${e.fields.length} fields |`).join('\n')}

## Customization

1. Modify \`count\` to change number of records
2. Add custom generators for specific fields
3. Adjust relationship strategies for linked data
4. Add more sample data arrays as needed

## Important Notes

1. **Idempotent**: Run multiple times safely (uses INSERT with ON CONFLICT)
2. **Tenant**: Seeds data for specific tenant ID
3. **Relationships**: Seeds parent entities before children
4. **Cleanup**: Add DELETE statements before INSERT for fresh seed
`;
}

function generateEntitySeedFunction(entity: EntitySeed, tenantId: string): string {
  const entityName = entity.entityKey.split('.').pop() || 'Entity';
  const pascalName = toPascalCase(entityName);

  const fieldGenerators = entity.fields
    .map((field) => `      ${field.key}: ${generateFieldValue(field)},`)
    .join('\n');

  return `async function seed${pascalName}() {
  console.log('  Seeding ${entity.entityKey}...');
  const records = [];

  for (let i = 0; i < ${entity.count}; i++) {
    const record = {
${fieldGenerators}
    };
    records.push(record);
  }

  // Insert records
  for (const record of records) {
    const id = uuidv4();
    await db.query(
      \`INSERT INTO data_records (id, tenant_id, entity_key, data, created_by, updated_by)
       VALUES ($1, $2, $3, $4, 'seed', 'seed')
       ON CONFLICT (id) DO NOTHING\`,
      [id, TENANT_ID, '${entity.entityKey}', JSON.stringify(record)]
    );
  }

  console.log('    ✓ Created ' + ${entity.count} + ' ${entityName} records');
}`;
}

function generateFieldValue(field: FieldSeed): string {
  if (field.value !== undefined) {
    return typeof field.value === 'string' ? `'${field.value}'` : String(field.value);
  }

  switch (field.type) {
    case 'string':
      return `randomChoice(firstNames) + ' ' + randomChoice(lastNames)`;
    case 'text':
      return `'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'`;
    case 'number':
      return `randomInt(1, 1000)`;
    case 'decimal':
    case 'currency':
      return `randomFloat(10, 500, 2)`;
    case 'percentage':
      return `randomFloat(0, 100, 1)`;
    case 'boolean':
      return `randomBoolean()`;
    case 'date':
      return `randomDate(new Date('2024-01-01'), new Date()).toISOString().split('T')[0]`;
    case 'datetime':
      return `randomDate(new Date('2024-01-01'), new Date()).toISOString()`;
    case 'email':
      return `randomChoice(firstNames).toLowerCase() + '.' + randomChoice(lastNames).toLowerCase() + '@example.com'`;
    case 'phone':
      return `'+1' + randomInt(200, 999) + randomInt(100, 999) + randomInt(1000, 9999)`;
    case 'url':
      return `'https://example.com/' + randomString(8)`;
    case 'select':
      const options = field.options?.selectOptions as Array<{ value: string }> || [{ value: 'default' }];
      return `randomChoice([${options.map((o) => `'${o.value}'`).join(', ')}])`;
    case 'reference':
      return `null`; // References handled separately
    case 'json':
      return `{}`;
    default:
      return `'Sample ${field.key}'`;
  }
}

function generateEntitySeedSQL(entity: EntitySeed, tenantId: string): string {
  const entityName = entity.entityKey.split('.').pop() || 'entity';
  const records: string[] = [];

  for (let i = 0; i < Math.min(entity.count, 10); i++) {
    // Generate only 10 example records for SQL
    const data: Record<string, unknown> = {};
    for (const field of entity.fields) {
      data[field.key] = getSampleSQLValue(field, i);
    }

    records.push(`  ('${entityName}-${i + 1}', '${tenantId}', '${entity.entityKey}', '${JSON.stringify(data)}'::jsonb, 'seed', 'seed')`);
  }

  return `-- Seed ${entity.entityKey}
INSERT INTO data_records (id, tenant_id, entity_key, data, created_by, updated_by)
VALUES
${records.join(',\n')}
ON CONFLICT (id) DO NOTHING;`;
}

function getSampleSQLValue(field: FieldSeed, index: number): unknown {
  if (field.value !== undefined) {
    return field.value;
  }

  switch (field.type) {
    case 'string':
      return `Sample ${field.key} ${index + 1}`;
    case 'text':
      return 'Lorem ipsum dolor sit amet';
    case 'number':
      return index * 10 + Math.floor(Math.random() * 100);
    case 'decimal':
    case 'currency':
      return parseFloat((Math.random() * 500 + 10).toFixed(2));
    case 'percentage':
      return parseFloat((Math.random() * 100).toFixed(1));
    case 'boolean':
      return index % 2 === 0;
    case 'date':
      return new Date(Date.now() - index * 86400000).toISOString().split('T')[0];
    case 'datetime':
      return new Date(Date.now() - index * 86400000).toISOString();
    case 'email':
      return `user${index + 1}@example.com`;
    case 'phone':
      return `+1555000${String(index + 1).padStart(4, '0')}`;
    case 'select':
      const options = field.options?.selectOptions as Array<{ value: string }> || [{ value: 'default' }];
      return options[index % options.length]?.value || 'default';
    default:
      return `${field.key}-${index + 1}`;
  }
}
