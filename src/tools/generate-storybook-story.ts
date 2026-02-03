import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface GenerateStorybookStoryArgs {
  componentName: string;
  componentPath: string;
  category?: string;
  props?: Array<{
    name: string;
    type: string;
    defaultValue?: unknown;
    description?: string;
    control?: string;
  }>;
}

export async function generateStorybookStory(args: GenerateStorybookStoryArgs): Promise<string> {
  const {
    componentName,
    componentPath,
    category = 'Components',
    props = [],
  } = args;

  // Validate component name is PascalCase
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
    throw new Error('Component name must be PascalCase (e.g., MyComponent)');
  }

  // Generate arg types
  const argTypesCode = props
    .map((prop) => {
      const control = prop.control || getDefaultControl(prop.type);
      return `    ${prop.name}: {
      description: '${prop.description || prop.name}',
      control: { type: '${control}' },
      ${prop.defaultValue !== undefined ? `defaultValue: ${JSON.stringify(prop.defaultValue)},` : ''}
    }`;
    })
    .join(',\n');

  // Generate default args
  const defaultArgsCode = props
    .filter((p) => p.defaultValue !== undefined)
    .map((p) => `    ${p.name}: ${JSON.stringify(p.defaultValue)}`)
    .join(',\n');

  // Generate story code
  const storyCode = `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from '${componentPath}';

const meta: Meta<typeof ${componentName}> = {
  title: '${category}/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '${componentName} component description',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
${argTypesCode || '    // Add arg types here'}
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ${componentName}>;

/**
 * Default story
 */
export const Default: Story = {
  args: {
${defaultArgsCode || '    // Add default args here'}
  },
};

/**
 * With custom props
 */
export const Custom: Story = {
  args: {
    ...Default.args,
    // Override props here
  },
};

/**
 * Loading state (if applicable)
 */
export const Loading: Story = {
  args: {
    ...Default.args,
    // isLoading: true,
  },
};

/**
 * Error state (if applicable)
 */
export const Error: Story = {
  args: {
    ...Default.args,
    // error: 'Something went wrong',
  },
};

/**
 * Disabled state (if applicable)
 */
export const Disabled: Story = {
  args: {
    ...Default.args,
    // disabled: true,
  },
};
`;

  return `# Storybook Story Generated

## Story File

Create \`${componentPath.replace('.tsx', '.stories.tsx').replace('.ts', '.stories.ts')}\`:

\`\`\`typescript
${storyCode}
\`\`\`

## Component Props Reference

${props.length > 0 ? `
| Prop | Type | Default | Description |
|------|------|---------|-------------|
${props.map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.defaultValue !== undefined ? `\`${JSON.stringify(p.defaultValue)}\`` : '-'} | ${p.description || '-'} |`).join('\n')}
` : 'No props defined'}

## Running Storybook

\`\`\`bash
# Start Storybook locally
cd apps/web && npm run storybook

# Or with Docker
docker-compose up storybook
\`\`\`

Access at: http://localhost:6006

## Story Types

1. **Default** - Basic usage with default props
2. **Custom** - Customized props example
3. **Loading** - Loading state (if component supports it)
4. **Error** - Error state (if component supports it)
5. **Disabled** - Disabled state (if component supports it)

## Best Practices

1. **Use argTypes** - Define controls for interactive props
2. **Add decorators** - Wrap stories for consistent layout
3. **Document props** - Use JSDoc comments for descriptions
4. **Cover states** - Include loading, error, disabled stories
5. **Use tags** - Add \`['autodocs']\` for automatic documentation
`;
}

function getDefaultControl(type: string): string {
  const controlMap: Record<string, string> = {
    string: 'text',
    number: 'number',
    boolean: 'boolean',
    array: 'object',
    object: 'object',
    function: 'none',
    ReactNode: 'none',
  };
  return controlMap[type] || 'text';
}
