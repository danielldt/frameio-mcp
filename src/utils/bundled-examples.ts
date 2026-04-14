import { generateModuleIndex } from './code-generator.js';
import { extractFeatures } from './example-loader.js';

export interface BundledExample {
  moduleId: string;
  content: string;
  features: string[];
}

function entry(moduleId: string, content: string): BundledExample {
  return { moduleId, content, features: extractFeatures(content) };
}

/** Shipped examples for hosted MCP (no access to the client's modules/ tree). */
function buildBundledMap(): Record<string, string> {
  return {
    rewards: generateModuleIndex(
      'rewards',
      'Rewards',
      'Loyalty points and rewards',
      [
        {
          key: 'rewards.program',
          name: 'Program',
          pluralName: 'Programs',
          description: 'Reward programs',
          icon: 'gift',
          fields: [
            { type: 'text', key: 'name', name: 'Name', options: { required: true } },
            { type: 'number', key: 'pointsMultiplier', name: 'Points multiplier', options: {} },
          ],
          views: [{ type: 'table', columns: ['name', 'pointsMultiplier'] }],
        },
      ],
      true,
      true
    ),

    bom: generateModuleIndex(
      'bom',
      'BOM',
      'Bill of materials',
      [
        {
          key: 'bom.header',
          name: 'BOM',
          pluralName: 'BOMs',
          description: 'Assembly structure',
          icon: 'layers',
          fields: [
            { type: 'text', key: 'code', name: 'Code', options: { required: true } },
            {
              type: 'reference',
              key: 'parent',
              name: 'Parent BOM',
              options: { refEntityKey: 'bom.header' },
            },
          ],
          views: [{ type: 'table', columns: ['code'] }],
        },
      ],
      false,
      false
    ),

    'calendar-demo': generateModuleIndex(
      'calendar-demo',
      'Calendar demo',
      'Sample calendar view',
      [
        {
          key: 'calendar-demo.event',
          name: 'Event',
          pluralName: 'Events',
          description: 'Scheduled items',
          icon: 'calendar',
          fields: [
            { type: 'text', key: 'title', name: 'Title', options: { required: true } },
            { type: 'date', key: 'start', name: 'Start', options: {} },
          ],
          views: [
            {
              type: 'calendar',
              dateField: 'start',
              titleField: 'title',
            },
          ],
        },
      ],
      false,
      false
    ),
  };
}

const BUNDLED = buildBundledMap();

const cached: BundledExample[] = Object.entries(BUNDLED).map(([moduleId, content]) =>
  entry(moduleId, content)
);

export function listBundledExamples(): BundledExample[] {
  return cached;
}

export function getBundledExample(moduleId: string): BundledExample | null {
  const content = BUNDLED[moduleId];
  if (!content) return null;
  return entry(moduleId, content);
}

export function findBundledByPattern(pattern: string): BundledExample[] {
  const lower = pattern.toLowerCase();
  return cached.filter((ex) => {
    if (ex.content.toLowerCase().includes(lower)) return true;
    return ex.features.some((f) => f.includes(lower));
  });
}

export function findBundledByFeature(feature: string): BundledExample[] {
  const f = feature.toLowerCase();
  return cached.filter((ex) => ex.features.includes(f));
}
