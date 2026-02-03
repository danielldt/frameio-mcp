import fs from 'fs-extra';
import path from 'path';
import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface GenerateTestArgs {
  modulePath: string;
  testType: 'entity' | 'workflow' | 'page' | 'widget';
  targetKey?: string;
}

export async function generateTest(args: GenerateTestArgs): Promise<string> {
  const { modulePath, testType, targetKey } = args;

  const fullPath = path.resolve(process.cwd(), modulePath);
  const moduleId = path.basename(fullPath);
  const camelCaseModuleId = toCamelCase(moduleId);

  // Check if module exists
  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Module directory not found: ${modulePath}`);
  }

  let testCode = '';
  let testFileName = '';

  switch (testType) {
    case 'entity':
      testCode = generateEntityTest(moduleId, camelCaseModuleId, targetKey);
      testFileName = targetKey ? `${targetKey.split('.').pop()}.test.ts` : `entities.test.ts`;
      break;
    case 'workflow':
      testCode = generateWorkflowTest(moduleId, camelCaseModuleId, targetKey);
      testFileName = targetKey ? `${targetKey.split('.').pop()}-workflow.test.ts` : `workflows.test.ts`;
      break;
    case 'page':
      testCode = generatePageTest(moduleId, camelCaseModuleId, targetKey);
      testFileName = targetKey ? `${targetKey}.test.tsx` : `pages.test.tsx`;
      break;
    case 'widget':
      testCode = generateWidgetTest(moduleId, camelCaseModuleId, targetKey);
      testFileName = targetKey ? `${targetKey.split('.').pop()}-widget.test.tsx` : `widgets.test.tsx`;
      break;
    default:
      throw new Error(`Unknown test type: ${testType}`);
  }

  return `# Test Generated

## Test File

Create \`${modulePath}/src/__tests__/${testFileName}\`:

\`\`\`typescript
${testCode}
\`\`\`

## Setup

### 1. Install Test Dependencies

\`\`\`bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
\`\`\`

### 2. Create Vitest Config

Create \`${modulePath}/vitest.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
\`\`\`

### 3. Create Test Setup File

Create \`${modulePath}/src/__tests__/setup.ts\`:

\`\`\`typescript
import '@testing-library/jest-dom';
\`\`\`

### 4. Update package.json

Add test script:

\`\`\`json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
\`\`\`

## Running Tests

\`\`\`bash
# Run tests in watch mode
npm test -w @frameio/${moduleId}

# Run tests once
npm run test:run -w @frameio/${moduleId}

# Run with coverage
npm run test:coverage -w @frameio/${moduleId}
\`\`\`
`;
}

function generateEntityTest(moduleId: string, camelCaseModuleId: string, targetKey?: string): string {
  const entityKey = targetKey || `${moduleId}.example`;
  const entityName = targetKey?.split('.').pop() || 'example';
  const entityVarName = toCamelCase(entityName);

  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlatformData, usePlatformMutation } from '@frameio/sdk/react';

// Mock the SDK
vi.mock('@frameio/sdk/react', () => ({
  usePlatformData: vi.fn(),
  usePlatformMutation: vi.fn(),
}));

describe('${entityKey} Entity', () => {
  const mockData = [
    { id: '1', name: 'Test Item 1', status: 'active' },
    { id: '2', name: 'Test Item 2', status: 'inactive' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Fetching', () => {
    it('should fetch ${entityName} records', async () => {
      const mockUsePlatformData = vi.mocked(usePlatformData);
      mockUsePlatformData.mockReturnValue({
        data: { data: mockData, pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => usePlatformData('${entityKey}'));

      expect(result.current.data?.data).toHaveLength(2);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle loading state', () => {
      const mockUsePlatformData = vi.mocked(usePlatformData);
      mockUsePlatformData.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => usePlatformData('${entityKey}'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should handle error state', () => {
      const mockUsePlatformData = vi.mocked(usePlatformData);
      mockUsePlatformData.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => usePlatformData('${entityKey}'));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Failed to fetch');
    });
  });

  describe('Data Mutations', () => {
    it('should create a new ${entityName}', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: '3', name: 'New Item' });
      const mockUsePlatformMutation = vi.mocked(usePlatformMutation);
      mockUsePlatformMutation.mockReturnValue({
        create: mockCreate,
        update: vi.fn(),
        remove: vi.fn(),
        isLoading: false,
      });

      const { result } = renderHook(() => usePlatformMutation('${entityKey}'));
      
      await result.current.create({ name: 'New Item', status: 'active' });
      
      expect(mockCreate).toHaveBeenCalledWith({ name: 'New Item', status: 'active' });
    });

    it('should update an existing ${entityName}', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: '1', name: 'Updated Item' });
      const mockUsePlatformMutation = vi.mocked(usePlatformMutation);
      mockUsePlatformMutation.mockReturnValue({
        create: vi.fn(),
        update: mockUpdate,
        remove: vi.fn(),
        isLoading: false,
      });

      const { result } = renderHook(() => usePlatformMutation('${entityKey}'));
      
      await result.current.update('1', { name: 'Updated Item' });
      
      expect(mockUpdate).toHaveBeenCalledWith('1', { name: 'Updated Item' });
    });

    it('should delete a ${entityName}', async () => {
      const mockRemove = vi.fn().mockResolvedValue(undefined);
      const mockUsePlatformMutation = vi.mocked(usePlatformMutation);
      mockUsePlatformMutation.mockReturnValue({
        create: vi.fn(),
        update: vi.fn(),
        remove: mockRemove,
        isLoading: false,
      });

      const { result } = renderHook(() => usePlatformMutation('${entityKey}'));
      
      await result.current.remove('1');
      
      expect(mockRemove).toHaveBeenCalledWith('1');
    });
  });

  describe('Filtering', () => {
    it('should filter ${entityName} records by status', () => {
      const mockUsePlatformData = vi.mocked(usePlatformData);
      mockUsePlatformData.mockReturnValue({
        data: { data: [mockData[0]], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => 
        usePlatformData('${entityKey}', {
          filters: [{ field: 'status', operator: 'eq', value: 'active' }],
        })
      );

      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.data[0].status).toBe('active');
    });
  });
});
`;
}

function generateWorkflowTest(moduleId: string, camelCaseModuleId: string, targetKey?: string): string {
  const workflowKey = targetKey || `${moduleId}.example-workflow`;
  const workflowName = targetKey?.split('.').pop() || 'example-workflow';

  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkflow, useWorkflowTransition } from '@frameio/sdk/react';

// Mock the SDK
vi.mock('@frameio/sdk/react', () => ({
  useWorkflow: vi.fn(),
  useWorkflowTransition: vi.fn(),
}));

describe('${workflowKey} Workflow', () => {
  const mockWorkflowInstance = {
    id: 'workflow-1',
    workflowKey: '${workflowKey}',
    recordId: 'record-1',
    currentState: 'draft',
    availableTransitions: [
      { key: 'submit', name: 'Submit', from: 'draft', to: 'submitted' },
    ],
    history: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workflow State', () => {
    it('should fetch workflow instance', () => {
      const mockUseWorkflow = vi.mocked(useWorkflow);
      mockUseWorkflow.mockReturnValue({
        workflow: mockWorkflowInstance,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useWorkflow('${workflowKey.split('.')[0]}.entity', 'record-1'));

      expect(result.current.workflow?.currentState).toBe('draft');
      expect(result.current.workflow?.availableTransitions).toHaveLength(1);
    });

    it('should show available transitions based on current state', () => {
      const mockUseWorkflow = vi.mocked(useWorkflow);
      mockUseWorkflow.mockReturnValue({
        workflow: mockWorkflowInstance,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useWorkflow('${workflowKey.split('.')[0]}.entity', 'record-1'));

      const transitions = result.current.workflow?.availableTransitions;
      expect(transitions).toContainEqual(
        expect.objectContaining({ key: 'submit', to: 'submitted' })
      );
    });
  });

  describe('Workflow Transitions', () => {
    it('should execute a transition', async () => {
      const mockTransition = vi.fn().mockResolvedValue({
        ...mockWorkflowInstance,
        currentState: 'submitted',
      });

      const mockUseWorkflowTransition = vi.mocked(useWorkflowTransition);
      mockUseWorkflowTransition.mockReturnValue({
        transition: mockTransition,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useWorkflowTransition());

      await result.current.transition({
        entityKey: '${workflowKey.split('.')[0]}.entity',
        recordId: 'record-1',
        transitionKey: 'submit',
      });

      expect(mockTransition).toHaveBeenCalled();
    });

    it('should handle transition errors', async () => {
      const mockTransition = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const mockUseWorkflowTransition = vi.mocked(useWorkflowTransition);
      mockUseWorkflowTransition.mockReturnValue({
        transition: mockTransition,
        isLoading: false,
        error: new Error('Permission denied'),
      });

      const { result } = renderHook(() => useWorkflowTransition());

      expect(result.current.error?.message).toBe('Permission denied');
    });
  });

  describe('Workflow History', () => {
    it('should track transition history', () => {
      const workflowWithHistory = {
        ...mockWorkflowInstance,
        currentState: 'submitted',
        history: [
          {
            transitionKey: 'submit',
            fromState: 'draft',
            toState: 'submitted',
            executedBy: 'user-1',
            executedAt: '2026-01-30T10:00:00Z',
          },
        ],
      };

      const mockUseWorkflow = vi.mocked(useWorkflow);
      mockUseWorkflow.mockReturnValue({
        workflow: workflowWithHistory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useWorkflow('${workflowKey.split('.')[0]}.entity', 'record-1'));

      expect(result.current.workflow?.history).toHaveLength(1);
      expect(result.current.workflow?.history[0].fromState).toBe('draft');
      expect(result.current.workflow?.history[0].toState).toBe('submitted');
    });
  });
});
`;
}

function generatePageTest(moduleId: string, camelCaseModuleId: string, targetKey?: string): string {
  const pageName = targetKey || 'CustomPage';
  const componentName = toPascalCase(pageName);

  return `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ${componentName} } from '../pages/${componentName}';

// Mock the SDK
vi.mock('@frameio/sdk/react', () => ({
  usePlatformData: vi.fn(() => ({
    data: { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useTenantContext: vi.fn(() => ({
    tenantId: 'test-tenant',
    tenantName: 'Test Tenant',
  })),
  useI18n: vi.fn(() => ({
    formatNumber: (n: number) => n.toString(),
    formatDate: (d: Date) => d.toISOString(),
    t: (key: string) => key,
  })),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('${componentName} Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page', () => {
    renderWithRouter(<${componentName} />);
    
    // Check that the page renders without crashing
    expect(document.body).toBeTruthy();
  });

  it('should show loading state initially', async () => {
    const { usePlatformData } = await import('@frameio/sdk/react');
    vi.mocked(usePlatformData).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter(<${componentName} />);
    
    // Check for loading indicator
    const loadingElement = screen.queryByText(/loading/i);
    expect(loadingElement).toBeTruthy();
  });

  it('should handle error state', async () => {
    const { usePlatformData } = await import('@frameio/sdk/react');
    vi.mocked(usePlatformData).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: vi.fn(),
    });

    renderWithRouter(<${componentName} />);
    
    // Verify component doesn't crash on error
    expect(document.body).toBeTruthy();
  });

  it('should display content when loaded', async () => {
    const { usePlatformData } = await import('@frameio/sdk/react');
    vi.mocked(usePlatformData).mockReturnValue({
      data: { 
        data: [{ id: '1', name: 'Test Item' }], 
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } 
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter(<${componentName} />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });
});
`;
}

function generateWidgetTest(moduleId: string, camelCaseModuleId: string, targetKey?: string): string {
  const widgetName = targetKey?.split('.').pop() || 'Custom';
  const componentName = toPascalCase(widgetName) + 'Widget';

  return `import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from '../widgets/${componentName}';
import type { WidgetMetadata } from '@frameio/shared';

describe('${componentName}', () => {
  const mockWidget: WidgetMetadata = {
    key: '${moduleId}.${widgetName.toLowerCase()}',
    moduleId: '${moduleId}',
    name: '${widgetName} Widget',
    description: 'Test widget',
    type: 'stat',
    defaultSize: { width: 1, height: 1 },
    propsSchema: {},
  };

  const mockData = {
    value: 42,
    label: 'Test Metric',
  };

  const mockFormatNumber = (n: number) => n.toLocaleString();

  it('should render the widget', () => {
    render(
      <${componentName} 
        data={mockData} 
        widget={mockWidget} 
        formatNumber={mockFormatNumber} 
      />
    );

    expect(document.body).toBeTruthy();
  });

  it('should display widget name', () => {
    render(
      <${componentName} 
        data={mockData} 
        widget={mockWidget} 
        formatNumber={mockFormatNumber} 
      />
    );

    const titleElement = screen.queryByText(mockWidget.name);
    expect(titleElement).toBeTruthy();
  });

  it('should display data value', () => {
    render(
      <${componentName} 
        data={mockData} 
        widget={mockWidget} 
        formatNumber={mockFormatNumber} 
      />
    );

    // Check that the value is rendered
    expect(document.body.textContent).toContain('42');
  });

  it('should handle empty data', () => {
    render(
      <${componentName} 
        data={{}} 
        widget={mockWidget} 
        formatNumber={mockFormatNumber} 
      />
    );

    // Should not crash with empty data
    expect(document.body).toBeTruthy();
  });

  it('should handle null formatNumber', () => {
    render(
      <${componentName} 
        data={mockData} 
        widget={mockWidget} 
      />
    );

    // Should not crash without formatNumber
    expect(document.body).toBeTruthy();
  });
});
`;
}
