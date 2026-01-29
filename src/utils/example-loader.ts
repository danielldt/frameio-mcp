import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface ExampleModule {
  moduleId: string;
  content: string;
  features: string[];
}

export async function loadExampleModule(moduleId?: string): Promise<ExampleModule | null> {
  const modulesDir = path.resolve(process.cwd(), 'modules');
  
  if (moduleId) {
    const modulePath = path.join(modulesDir, moduleId, 'src', 'index.ts');
    if (await fs.pathExists(modulePath)) {
      const content = await fs.readFile(modulePath, 'utf-8');
      const features = extractFeatures(content);
      return { moduleId, content, features };
    }
    return null;
  }

  // Return first available module
  const modules = await fs.readdir(modulesDir);
  for (const mod of modules) {
    const modulePath = path.join(modulesDir, mod, 'src', 'index.ts');
    if (await fs.pathExists(modulePath)) {
      const content = await fs.readFile(modulePath, 'utf-8');
      const features = extractFeatures(content);
      return { moduleId: mod, content, features };
    }
  }

  return null;
}

export async function findExamplesByPattern(pattern: string): Promise<ExampleModule[]> {
  const modulesDir = path.resolve(process.cwd(), 'modules');
  const modules = await fs.readdir(modulesDir);
  const results: ExampleModule[] = [];

  for (const mod of modules) {
    const modulePath = path.join(modulesDir, mod, 'src', 'index.ts');
    if (await fs.pathExists(modulePath)) {
      const content = await fs.readFile(modulePath, 'utf-8');
      
      if (matchesPattern(content, pattern)) {
        const features = extractFeatures(content);
        results.push({ moduleId: mod, content, features });
      }
    }
  }

  return results;
}

export async function findExamplesByFeature(feature: string): Promise<ExampleModule[]> {
  const modulesDir = path.resolve(process.cwd(), 'modules');
  const modules = await fs.readdir(modulesDir);
  const results: ExampleModule[] = [];

  for (const mod of modules) {
    const modulePath = path.join(modulesDir, mod, 'src', 'index.ts');
    if (await fs.pathExists(modulePath)) {
      const content = await fs.readFile(modulePath, 'utf-8');
      const features = extractFeatures(content);
      
      if (features.includes(feature.toLowerCase())) {
        results.push({ moduleId: mod, content, features });
      }
    }
  }

  return results;
}

function extractFeatures(content: string): string[] {
  const features: string[] = [];

  if (content.includes('defineEntity')) features.push('entities');
  if (content.includes('navItem') || content.includes('navSection')) features.push('navigation');
  if (content.includes('command(')) features.push('commands');
  if (content.includes('statCard')) features.push('stat-cards');
  if (content.includes('quickLink')) features.push('quick-links');
  if (content.includes('kanbanView')) features.push('kanban-view');
  if (content.includes('calendarView')) features.push('calendar-view');
  if (content.includes('ganttView')) features.push('gantt-view');
  if (content.includes('mapView')) features.push('map-view');
  if (content.includes('referenceField')) features.push('reference-field');
  if (content.includes('selectField')) features.push('select-field');
  if (content.includes('multiselectField')) features.push('multiselect-field');

  return features;
}

function matchesPattern(content: string, pattern: string): boolean {
  const lowerContent = content.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  // Check for exact pattern matches
  const patterns: Record<string, RegExp> = {
    'reference-field': /referenceField/,
    'kanban-view': /kanbanView/,
    'calendar-view': /calendarView/,
    'gantt-view': /ganttView/,
    'map-view': /mapView/,
    'select-field': /selectField/,
    'multiselect-field': /multiselectField/,
    'navigation': /navItem|navSection/,
    'commands': /command\(/,
    'stat-cards': /statCard/,
    'quick-links': /quickLink/,
  };

  if (patterns[lowerPattern]) {
    return patterns[lowerPattern].test(content);
  }

  // Fallback to simple string match
  return lowerContent.includes(lowerPattern);
}
