import fs from 'fs-extra';
import path from 'path';

interface AnalysisResult {
  valid: boolean;
  score: number;
  summary: string;
  issues: AnalysisIssue[];
  suggestions: string[];
  entities: EntityInfo[];
  permissions: PermissionInfo[];
  navigation: NavigationInfo[];
  workflows: WorkflowInfo[];
}

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
}

interface EntityInfo {
  key: string;
  name: string;
  fieldCount: number;
  hasPermissions: boolean;
  views: string[];
}

interface PermissionInfo {
  key: string;
  used: boolean;
  usedIn: string[];
}

interface NavigationInfo {
  key: string;
  path: string;
  hasValidTarget: boolean;
}

interface WorkflowInfo {
  key: string;
  entityKey: string;
  stateCount: number;
  transitionCount: number;
}

interface AnalyzeModuleArgs {
  modulePath: string;
  checks?: string[];
}

export async function analyzeModule(args: AnalyzeModuleArgs): Promise<string> {
  const { modulePath, checks = [] } = args;

  const fullPath = path.resolve(process.cwd(), modulePath);
  const moduleId = path.basename(fullPath);

  const result: AnalysisResult = {
    valid: true,
    score: 100,
    summary: '',
    issues: [],
    suggestions: [],
    entities: [],
    permissions: [],
    navigation: [],
    workflows: [],
  };

  // Check if module exists
  if (!(await fs.pathExists(fullPath))) {
    result.valid = false;
    result.issues.push({
      severity: 'error',
      category: 'structure',
      message: `Module directory not found: ${modulePath}`,
    });
    result.score = 0;
    return formatAnalysisResult(result, moduleId);
  }

  // Check basic structure
  const indexPath = path.join(fullPath, 'src', 'index.ts');
  const packageJsonPath = path.join(fullPath, 'package.json');

  if (!(await fs.pathExists(indexPath))) {
    result.valid = false;
    result.issues.push({
      severity: 'error',
      category: 'structure',
      message: 'src/index.ts not found',
      file: 'src/index.ts',
    });
    result.score -= 30;
  }

  if (!(await fs.pathExists(packageJsonPath))) {
    result.issues.push({
      severity: 'warning',
      category: 'structure',
      message: 'package.json not found',
      file: 'package.json',
    });
    result.score -= 10;
  } else {
    // Check package.json naming
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.name !== `@frameio/${moduleId}`) {
        result.issues.push({
          severity: 'warning',
          category: 'conventions',
          message: `Package name should be '@frameio/${moduleId}', found '${packageJson.name}'`,
          file: 'package.json',
        });
        result.score -= 5;
      }
    } catch (e) {
      result.issues.push({
        severity: 'error',
        category: 'structure',
        message: 'Invalid package.json format',
        file: 'package.json',
      });
      result.score -= 10;
    }
  }

  // Read and analyze index.ts if it exists
  if (await fs.pathExists(indexPath)) {
    const content = await fs.readFile(indexPath, 'utf-8');
    
    // Check for createModule usage
    if (!content.includes('createModule')) {
      result.issues.push({
        severity: 'error',
        category: 'exports',
        message: 'Module does not use createModule()',
        file: 'src/index.ts',
      });
      result.score -= 20;
    }

    // Check for proper export
    const camelCaseId = moduleId.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const expectedExport = `${camelCaseId}Module`;
    if (!content.includes(`export const ${expectedExport}`)) {
      result.issues.push({
        severity: 'warning',
        category: 'conventions',
        message: `Expected export name '${expectedExport}'`,
        file: 'src/index.ts',
      });
      result.score -= 5;
    }

    // Analyze entities
    const entityMatches = content.matchAll(/defineEntity\(['"]([\w.-]+)['"]\)/g);
    for (const match of entityMatches) {
      const entityKey = match[1];
      const entityInfo: EntityInfo = {
        key: entityKey,
        name: extractEntityName(content, entityKey),
        fieldCount: countFields(content, entityKey),
        hasPermissions: content.includes(`'${entityKey}.read'`),
        views: extractViews(content, entityKey),
      };
      result.entities.push(entityInfo);

      // Check entity key format
      if (!entityKey.startsWith(moduleId + '.')) {
        result.issues.push({
          severity: 'warning',
          category: 'conventions',
          message: `Entity key '${entityKey}' should start with module ID '${moduleId}.'`,
          file: 'src/index.ts',
        });
        result.score -= 3;
      }

      // Check for permissions
      if (!entityInfo.hasPermissions) {
        result.issues.push({
          severity: 'warning',
          category: 'security',
          message: `Entity '${entityKey}' may be missing permissions`,
          file: 'src/index.ts',
        });
        result.score -= 5;
      }
    }

    // Analyze permissions
    const permissionMatches = content.matchAll(/permission\(['"]([\w.-]+)['"]/g);
    for (const match of permissionMatches) {
      const permKey = match[1];
      result.permissions.push({
        key: permKey,
        used: content.includes(`permission: '${permKey}'`) || 
              content.includes(`permissions: ['${permKey}'`) ||
              content.includes(`'${permKey}'`),
        usedIn: findPermissionUsages(content, permKey),
      });
    }

    // Check for unused permissions
    const unusedPermissions = result.permissions.filter((p) => p.usedIn.length <= 1);
    if (unusedPermissions.length > 0) {
      result.suggestions.push(
        `Consider reviewing permissions: ${unusedPermissions.map((p) => p.key).join(', ')} - may be unused`
      );
    }

    // Analyze navigation
    const navItemMatches = content.matchAll(/navItem\(['"]([\w-]+)['"],\s*['"]([\w\s]+)['"],\s*['"]([\w-]+)['"],\s*['"]([\w/.-]+)['"]/g);
    for (const match of navItemMatches) {
      const navKey = match[1];
      const navPath = match[4];
      result.navigation.push({
        key: navKey,
        path: navPath,
        hasValidTarget: checkNavigationTarget(content, navPath, result.entities),
      });

      if (!result.navigation[result.navigation.length - 1].hasValidTarget) {
        result.issues.push({
          severity: 'info',
          category: 'navigation',
          message: `Navigation item '${navKey}' points to '${navPath}' - verify target exists`,
          file: 'src/index.ts',
        });
      }
    }

    // Analyze workflows
    const workflowMatches = content.matchAll(/defineWorkflow\(['"]([\w.-]+)['"]\)/g);
    for (const match of workflowMatches) {
      const workflowKey = match[1];
      result.workflows.push({
        key: workflowKey,
        entityKey: extractWorkflowEntityKey(content, workflowKey),
        stateCount: countWorkflowStates(content, workflowKey),
        transitionCount: countWorkflowTransitions(content, workflowKey),
      });
    }

    // Check imports
    if (!content.includes("from '@frameio/sdk'")) {
      result.issues.push({
        severity: 'warning',
        category: 'imports',
        message: "Missing import from '@frameio/sdk'",
        file: 'src/index.ts',
      });
      result.score -= 5;
    }

    // Suggestions based on analysis
    if (result.entities.length === 0) {
      result.suggestions.push('Consider adding entities to your module');
    }

    if (result.navigation.length === 0) {
      result.suggestions.push('Consider adding navigation items for better discoverability');
    }

    if (result.entities.length > 0 && result.workflows.length === 0) {
      result.suggestions.push('Consider adding workflows for entities that need state management');
    }
  }

  // Check for pages directory
  const pagesDir = path.join(fullPath, 'src', 'pages');
  if (await fs.pathExists(pagesDir)) {
    const pagesIndex = path.join(pagesDir, 'index.ts');
    if (!(await fs.pathExists(pagesIndex))) {
      result.issues.push({
        severity: 'info',
        category: 'structure',
        message: 'Pages directory exists but src/pages/index.ts is missing',
        file: 'src/pages/index.ts',
      });
    }
  }

  // Calculate final score
  result.score = Math.max(0, Math.min(100, result.score));
  result.valid = result.issues.filter((i) => i.severity === 'error').length === 0;

  // Generate summary
  const errorCount = result.issues.filter((i) => i.severity === 'error').length;
  const warningCount = result.issues.filter((i) => i.severity === 'warning').length;
  result.summary = `Score: ${result.score}/100 | ${errorCount} errors, ${warningCount} warnings | ${result.entities.length} entities, ${result.permissions.length} permissions`;

  return formatAnalysisResult(result, moduleId);
}

// Helper functions
function extractEntityName(content: string, entityKey: string): string {
  const regex = new RegExp(`defineEntity\\(['"]${entityKey.replace('.', '\\.')}['"]\\)[\\s\\S]*?\\.name\\(['"]([^'"]+)['"]\\)`);
  const match = content.match(regex);
  return match ? match[1] : entityKey.split('.').pop() || 'Unknown';
}

function countFields(content: string, entityKey: string): number {
  // Simple heuristic: count field method calls after the entity definition
  const fieldMethods = [
    'stringField', 'textField', 'numberField', 'decimalField',
    'booleanField', 'dateField', 'datetimeField', 'emailField',
    'phoneField', 'urlField', 'selectField', 'multiselectField',
    'referenceField', 'locationField', 'currencyField', 'percentageField',
    'jsonField',
  ];
  
  let count = 0;
  for (const method of fieldMethods) {
    const matches = content.match(new RegExp(`\\.${method}\\(`, 'g'));
    if (matches) count += matches.length;
  }
  return count;
}

function extractViews(content: string, entityKey: string): string[] {
  const views: string[] = [];
  if (content.includes('.tableView(')) views.push('table');
  if (content.includes('.kanbanView(')) views.push('kanban');
  if (content.includes('.calendarView(')) views.push('calendar');
  if (content.includes('.ganttView(')) views.push('gantt');
  if (content.includes('.mapView(')) views.push('map');
  return views;
}

function findPermissionUsages(content: string, permKey: string): string[] {
  const usages: string[] = [];
  if (content.includes(`permission: '${permKey}'`)) usages.push('entity/nav');
  if (content.includes(`'${permKey}.read'`)) usages.push('read');
  if (content.includes(`'${permKey}.create'`)) usages.push('create');
  if (content.includes(`'${permKey}.update'`)) usages.push('update');
  if (content.includes(`'${permKey}.delete'`)) usages.push('delete');
  return usages;
}

function checkNavigationTarget(content: string, navPath: string, entities: EntityInfo[]): boolean {
  // Check if path points to an entity
  if (navPath.startsWith('/entities/')) {
    const entityKey = navPath.replace('/entities/', '').split('/')[0];
    return entities.some((e) => e.key === entityKey);
  }
  // Custom paths are assumed valid
  return true;
}

function extractWorkflowEntityKey(content: string, workflowKey: string): string {
  const regex = new RegExp(`defineWorkflow\\(['"]${workflowKey.replace('.', '\\.')}['"]\\)[\\s\\S]*?\\.forEntity\\(['"]([^'"]+)['"]`);
  const match = content.match(regex);
  return match ? match[1] : 'unknown';
}

function countWorkflowStates(content: string, workflowKey: string): number {
  const stateMethodCount = (content.match(/\.(initial|intermediate|final|cancelled)State\(/g) || []).length;
  return stateMethodCount;
}

function countWorkflowTransitions(content: string, workflowKey: string): number {
  const transitionMethodCount = (content.match(/\.(simple|approval)Transition\(/g) || []).length;
  return transitionMethodCount;
}

function formatAnalysisResult(result: AnalysisResult, moduleId: string): string {
  const statusEmoji = result.valid ? '✅' : '❌';
  const scoreColor = result.score >= 80 ? 'green' : result.score >= 50 ? 'yellow' : 'red';

  let output = `# Module Analysis: ${moduleId}

## Summary

${statusEmoji} **Status:** ${result.valid ? 'Valid' : 'Invalid'}
📊 **Score:** ${result.score}/100
📝 **${result.summary}**

`;

  // Issues section
  if (result.issues.length > 0) {
    output += `## Issues Found (${result.issues.length})\n\n`;
    
    const errors = result.issues.filter((i) => i.severity === 'error');
    const warnings = result.issues.filter((i) => i.severity === 'warning');
    const infos = result.issues.filter((i) => i.severity === 'info');

    if (errors.length > 0) {
      output += `### ❌ Errors (${errors.length})\n\n`;
      errors.forEach((issue) => {
        output += `- **${issue.category}:** ${issue.message}${issue.file ? ` (${issue.file})` : ''}\n`;
      });
      output += '\n';
    }

    if (warnings.length > 0) {
      output += `### ⚠️ Warnings (${warnings.length})\n\n`;
      warnings.forEach((issue) => {
        output += `- **${issue.category}:** ${issue.message}${issue.file ? ` (${issue.file})` : ''}\n`;
      });
      output += '\n';
    }

    if (infos.length > 0) {
      output += `### ℹ️ Info (${infos.length})\n\n`;
      infos.forEach((issue) => {
        output += `- **${issue.category}:** ${issue.message}${issue.file ? ` (${issue.file})` : ''}\n`;
      });
      output += '\n';
    }
  }

  // Entities section
  if (result.entities.length > 0) {
    output += `## Entities (${result.entities.length})\n\n`;
    output += '| Key | Name | Fields | Permissions | Views |\n';
    output += '|-----|------|--------|-------------|-------|\n';
    result.entities.forEach((entity) => {
      output += `| \`${entity.key}\` | ${entity.name} | ${entity.fieldCount} | ${entity.hasPermissions ? '✅' : '❌'} | ${entity.views.join(', ') || 'none'} |\n`;
    });
    output += '\n';
  }

  // Permissions section
  if (result.permissions.length > 0) {
    output += `## Permissions (${result.permissions.length})\n\n`;
    output += '| Key | Status |\n';
    output += '|-----|--------|\n';
    result.permissions.forEach((perm) => {
      output += `| \`${perm.key}\` | ${perm.usedIn.length > 1 ? '✅ Used' : '⚠️ Check usage'} |\n`;
    });
    output += '\n';
  }

  // Navigation section
  if (result.navigation.length > 0) {
    output += `## Navigation (${result.navigation.length})\n\n`;
    output += '| Key | Path | Valid Target |\n';
    output += '|-----|------|-------------|\n';
    result.navigation.forEach((nav) => {
      output += `| \`${nav.key}\` | ${nav.path} | ${nav.hasValidTarget ? '✅' : '⚠️'} |\n`;
    });
    output += '\n';
  }

  // Workflows section
  if (result.workflows.length > 0) {
    output += `## Workflows (${result.workflows.length})\n\n`;
    output += '| Key | Entity | States | Transitions |\n';
    output += '|-----|--------|--------|-------------|\n';
    result.workflows.forEach((wf) => {
      output += `| \`${wf.key}\` | ${wf.entityKey} | ${wf.stateCount} | ${wf.transitionCount} |\n`;
    });
    output += '\n';
  }

  // Suggestions section
  if (result.suggestions.length > 0) {
    output += `## Suggestions\n\n`;
    result.suggestions.forEach((suggestion) => {
      output += `- 💡 ${suggestion}\n`;
    });
    output += '\n';
  }

  return output;
}
