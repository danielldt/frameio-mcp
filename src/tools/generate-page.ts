import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

interface GeneratePageArgs {
  moduleId: string;
  pageKey: string;
  pageName: string;
  path: string;
  componentName: string;
  permission?: string;
  icon?: string;
  description?: string;
}

export async function generatePage(args: GeneratePageArgs): Promise<string> {
  const {
    moduleId,
    pageKey,
    pageName,
    path,
    componentName,
    permission,
    icon = 'file',
    description = '',
  } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  // Validate component name is PascalCase
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
    throw new Error('Component name must be PascalCase (e.g., SalesDashboard)');
  }

  // Generate the page component
  const pageComponent = `import React, { useState, useEffect } from 'react';
import { usePlatformData, useTenantContext, useI18n } from '@frameio/sdk/react';

/**
 * ${pageName}
 * 
 * ${description || `Custom page for ${moduleId} module`}
 */
export function ${componentName}() {
  const tenant = useTenantContext();
  const { formatNumber, formatDate } = useI18n();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize page
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="${pageKey}-page">
      <header className="page-header">
        <h1>${pageName}</h1>
        <p>Welcome to ${pageName}</p>
      </header>

      <main className="page-content">
        {/* Add your page content here */}
        <div className="placeholder-content">
          <p>This is a placeholder for your custom page content.</p>
          <p>Edit this file to add your specific functionality.</p>
        </div>
      </main>

      <style>{\`
        .${pageKey}-page {
          padding: 1.5rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--theme-text, #f1f5f9);
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--theme-text-secondary, #94a3b8);
        }

        .page-content {
          background: var(--theme-surface, #1e293b);
          border: 1px solid var(--theme-border, #334155);
          border-radius: 8px;
          padding: 1.5rem;
        }

        .placeholder-content {
          text-align: center;
          color: var(--theme-text-secondary, #94a3b8);
        }

        .page-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          color: var(--theme-text-secondary, #94a3b8);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--theme-border, #334155);
          border-top-color: var(--theme-primary, #38bdf8);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      \`}</style>
    </div>
  );
}

export default ${componentName};
`;

  // Generate the pages/index.ts export
  const pagesIndexExport = `export { ${componentName} } from './${componentName}.js';`;

  // Generate page registration code
  const defaultPermission = permission || `${moduleId}.${pageKey}.view`;
  const pageRegistration = `import { definePage } from '@frameio/sdk';

const ${toCamelCase(pageKey)}Page = definePage('${pageKey}')
  .path('${path}')
  .name('${pageName}')
  .icon('${icon}')
  .permission('${defaultPermission}')
  .component('${componentName}')
  .build();`;

  // Generate permission if not provided
  const permissionCode = permission
    ? ''
    : `permission('${defaultPermission}', 'View ${pageName}', 'Can view ${pageName.toLowerCase()} page'),`;

  return `# Page Component Generated

## Files to Create

### 1. \`src/pages/${componentName}.tsx\`

\`\`\`typescript
${pageComponent}
\`\`\`

### 2. Update \`src/pages/index.ts\`

Add this export:

\`\`\`typescript
${pagesIndexExport}
\`\`\`

### 3. Page Registration (in \`src/index.ts\`)

\`\`\`typescript
${pageRegistration}
\`\`\`

${
  permissionCode
    ? `### 4. Permission (if not already defined)

\`\`\`typescript
${permissionCode}
\`\`\`
`
    : ''
}

## Module Registration

Add the page to your module:

\`\`\`typescript
export const ${toCamelCase(moduleId)}Module = createModule({
  id: '${moduleId}',
  // ... other config
})
  ${permissionCode ? `.registerPermissions([${permissionCode}])` : ''}
  .registerPages([${toCamelCase(pageKey)}Page])
  .build();
\`\`\`

## Navigation Item (Optional)

If you want to add navigation for this page:

\`\`\`typescript
navItem('${moduleId}-${pageKey}', '${pageName}', '${icon}', '${path}', 'sidebar', {
  permission: '${defaultPermission}',
  order: 1,
})
\`\`\`

## Summary

- **Page Key:** \`${pageKey}\`
- **Component:** \`${componentName}\`
- **Path:** \`${path}\`
- **Permission:** \`${defaultPermission}\`
`;
}
