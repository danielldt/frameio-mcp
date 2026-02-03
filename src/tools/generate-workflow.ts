import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface WorkflowState {
  key: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'cancelled';
  color?: string;
}

interface WorkflowTransition {
  key: string;
  name: string;
  from: string | string[];
  to: string;
  permission: string;
  requiresApproval?: boolean;
  approvalConfig?: {
    requiredApprovers?: number;
    approverRoles?: string[];
  };
}

interface GenerateWorkflowArgs {
  workflowKey: string;
  name: string;
  description: string;
  entityKey: string;
  statusField: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export async function generateWorkflow(args: GenerateWorkflowArgs): Promise<string> {
  const { workflowKey, name, description, entityKey, statusField, states, transitions } = args;

  // Validate workflow key format
  if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(workflowKey)) {
    throw new Error(
      'Workflow key must be in format {module-id}.{workflow-name} (e.g., pos.order-approval)'
    );
  }

  // Validate entity key format
  if (!/^[a-z0-9-]+\.[a-z0-9_]+$/.test(entityKey)) {
    throw new Error(
      'Entity key must be in format {module-id}.{entity-name} (e.g., pos.order)'
    );
  }

  if (!states || states.length === 0) {
    throw new Error('At least one state is required');
  }

  // Validate states have an initial state
  const hasInitialState = states.some((s) => s.type === 'initial');
  if (!hasInitialState) {
    throw new Error('Workflow must have at least one initial state');
  }

  // Generate workflow variable name
  const workflowVarName = workflowKey.split('.').pop()?.replace(/-/g, '') || 'workflow';
  const camelCaseVar = workflowVarName.charAt(0).toLowerCase() + workflowVarName.slice(1);

  // Generate state code
  const stateCode = states
    .map((state) => {
      const colorArg = state.color ? `, '${state.color}'` : '';
      switch (state.type) {
        case 'initial':
          return `  .initialState('${state.key}', '${state.name}'${colorArg})`;
        case 'intermediate':
          return `  .intermediateState('${state.key}', '${state.name}'${colorArg})`;
        case 'final':
          return `  .finalState('${state.key}', '${state.name}'${colorArg})`;
        case 'cancelled':
          return `  .cancelledState('${state.key}', '${state.name}'${colorArg})`;
        default:
          return `  .state('${state.key}', '${state.name}', '${state.type}'${colorArg})`;
      }
    })
    .join('\n');

  // Generate transition code
  const transitionCode = transitions
    .map((transition) => {
      const fromValue =
        Array.isArray(transition.from)
          ? `[${transition.from.map((f) => `'${f}'`).join(', ')}]`
          : `'${transition.from}'`;

      if (transition.requiresApproval && transition.approvalConfig) {
        const approvalConfigStr = JSON.stringify(transition.approvalConfig, null, 4)
          .split('\n')
          .map((line, i) => (i === 0 ? line : '    ' + line))
          .join('\n');
        return `  .approvalTransition('${transition.key}', '${transition.name}', ${fromValue}, '${transition.to}', '${transition.permission}', ${approvalConfigStr})`;
      } else {
        return `  .simpleTransition('${transition.key}', '${transition.name}', ${fromValue}, '${transition.to}', '${transition.permission}')`;
      }
    })
    .join('\n');

  // Generate permissions for transitions
  const transitionPermissions = transitions.map((t) => {
    const permKey = t.permission;
    const permName = t.name;
    return `  permission('${permKey}', '${permName}', 'Can ${t.name.toLowerCase()} ${entityKey.split('.').pop()}'),`;
  });

  const uniquePermissions = [...new Set(transitionPermissions)].join('\n');

  const workflowCode = `// Workflow: ${name}
const ${camelCaseVar}Workflow = defineWorkflow('${workflowKey}')
  .name('${name}')
  .description('${description}')
  .forEntity('${entityKey}', '${statusField}')
${stateCode}
${transitionCode}
  .build();`;

  const permissionsCode = `// Workflow Permissions
const workflowPermissions = [
${uniquePermissions}
];`;

  return `# Workflow Definition Generated

## Workflow Code

\`\`\`typescript
import { defineWorkflow, permission } from '@frameio/sdk';

${workflowCode}

${permissionsCode}
\`\`\`

## Usage

Add this workflow to your module registration:

\`\`\`typescript
export const myModule = createModule({
  id: '${workflowKey.split('.')[0]}',
  version: '1.0.0',
  displayName: 'My Module',
  description: 'Module description',
})
  .registerPermissions(workflowPermissions)
  .registerWorkflows([${camelCaseVar}Workflow])
  .build();
\`\`\`

## State Summary

${states.map((s) => `- **${s.name}** (\`${s.key}\`): ${s.type} state`).join('\n')}

## Transition Summary

${transitions.map((t) => `- **${t.name}** (\`${t.key}\`): ${Array.isArray(t.from) ? t.from.join(', ') : t.from} → ${t.to}${t.requiresApproval ? ' (requires approval)' : ''}`).join('\n')}
`;
}
