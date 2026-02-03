import { toCamelCase, toPascalCase } from '../utils/code-generator.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface GenerateApiEndpointArgs {
  moduleId: string;
  endpointPath: string;
  method: HttpMethod;
  handlerName: string;
  description: string;
  permissions?: string[];
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}

export async function generateApiEndpoint(args: GenerateApiEndpointArgs): Promise<string> {
  const {
    moduleId,
    endpointPath,
    method,
    handlerName,
    description,
    permissions = [],
    requestSchema = {},
    responseSchema = {},
  } = args;

  // Validate module ID format
  if (!/^[a-z0-9-]+$/.test(moduleId)) {
    throw new Error('Module ID must be kebab-case (lowercase letters, numbers, and hyphens)');
  }

  // Validate handler name
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(handlerName)) {
    throw new Error('Handler name must be a valid JavaScript identifier');
  }

  const camelCaseModuleId = toCamelCase(moduleId);
  const pascalCaseHandler = toPascalCase(handlerName);

  // Generate Swagger documentation
  const swaggerDoc = generateSwaggerDoc(endpointPath, method, description, requestSchema, responseSchema, permissions);

  // Generate permission check middleware
  const permissionCheck = permissions.length > 0
    ? `requirePermission(${permissions.map(p => `'${p}'`).join(', ')}),`
    : '';

  // Generate request body type if needed
  const requestBodyType = Object.keys(requestSchema).length > 0
    ? generateTypeFromSchema(`${pascalCaseHandler}Request`, requestSchema)
    : '';

  // Generate response type
  const responseType = Object.keys(responseSchema).length > 0
    ? generateTypeFromSchema(`${pascalCaseHandler}Response`, responseSchema)
    : '';

  // Generate route handler
  const routeHandler = `
/**
${swaggerDoc}
 */
${camelCaseModuleId}Router.${method.toLowerCase()}(
  '${endpointPath}',
  requireTenant,
  authenticate,
  ${permissionCheck}
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId, permissions } = req.context!;
      ${Object.keys(requestSchema).length > 0 ? `const body = req.body as ${pascalCaseHandler}Request;` : ''}

      // TODO: Implement ${handlerName} logic
      const result = await ${handlerName}(
        tenantId,
        ${Object.keys(requestSchema).length > 0 ? 'body' : ''}
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);`;

  // Generate service function stub
  const serviceFunction = `
/**
 * ${description}
 */
export async function ${handlerName}(
  tenantId: string,
  ${Object.keys(requestSchema).length > 0 ? `data: ${pascalCaseHandler}Request` : ''}
): Promise<${Object.keys(responseSchema).length > 0 ? pascalCaseHandler + 'Response' : 'unknown'}> {
  // TODO: Implement business logic
  
  return {
    // Return response data
  };
}`;

  return `# API Endpoint Generated

## Route Handler

Add to your module's router file (e.g., \`apps/api/src/routes/${moduleId}.ts\`):

\`\`\`typescript
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireTenant, requirePermission } from '../middleware/auth.js';
import { ${handlerName} } from '../services/${moduleId}.js';
${requestBodyType ? `\n// Types\n${requestBodyType}` : ''}
${responseType ? `\n${responseType}` : ''}

const ${camelCaseModuleId}Router = Router();
${routeHandler}

export { ${camelCaseModuleId}Router };
\`\`\`

## Service Function

Add to \`apps/api/src/services/${moduleId}.ts\`:

\`\`\`typescript
import { db } from '../db/client.js';
import { Errors } from '../middleware/error-handler.js';

${requestBodyType || ''}
${responseType || ''}
${serviceFunction}
\`\`\`

## Register Router

Add to \`apps/api/src/index.ts\`:

\`\`\`typescript
import { ${camelCaseModuleId}Router } from './routes/${moduleId}.js';

// In the routes section:
app.use('/api/v1/${moduleId}', ${camelCaseModuleId}Router);
\`\`\`

## Endpoint Summary

| Property | Value |
|----------|-------|
| Method | \`${method}\` |
| Path | \`/api/v1/${moduleId}${endpointPath}\` |
| Handler | \`${handlerName}\` |
| Permissions | ${permissions.length > 0 ? permissions.map(p => `\`${p}\``).join(', ') : 'None (authenticated only)'} |

## Swagger Documentation

The route handler includes Swagger/OpenAPI documentation comments. Access docs at:
\`http://localhost:3001/api-docs\`

${requestSchema && Object.keys(requestSchema).length > 0 ? `
## Request Body Schema

\`\`\`json
${JSON.stringify(requestSchema, null, 2)}
\`\`\`
` : ''}

${responseSchema && Object.keys(responseSchema).length > 0 ? `
## Response Schema

\`\`\`json
${JSON.stringify(responseSchema, null, 2)}
\`\`\`
` : ''}

## Example Usage

\`\`\`bash
curl -X ${method} http://localhost:3001/api/v1/${moduleId}${endpointPath} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-Tenant-Id: YOUR_TENANT" \\
  -H "Content-Type: application/json"${Object.keys(requestSchema).length > 0 ? ` \\
  -d '${JSON.stringify(requestSchema, null, 2)}'` : ''}
\`\`\`
`;
}

function generateSwaggerDoc(
  path: string,
  method: HttpMethod,
  description: string,
  requestSchema: Record<string, unknown>,
  responseSchema: Record<string, unknown>,
  permissions: string[]
): string {
  const lines = [
    ' * @swagger',
    ` * ${path}:`,
    ` *   ${method.toLowerCase()}:`,
    ` *     summary: ${description}`,
    ' *     tags:',
    ' *       - Custom',
    ' *     security:',
    ' *       - bearerAuth: []',
    ' *       - tenantHeader: []',
  ];

  if (permissions.length > 0) {
    lines.push(' *     description: |');
    lines.push(` *       Required permissions: ${permissions.join(', ')}`);
  }

  if (Object.keys(requestSchema).length > 0) {
    lines.push(' *     requestBody:');
    lines.push(' *       required: true');
    lines.push(' *       content:');
    lines.push(' *         application/json:');
    lines.push(' *           schema:');
    lines.push(' *             type: object');
  }

  lines.push(' *     responses:');
  lines.push(' *       200:');
  lines.push(' *         description: Success');
  lines.push(' *       401:');
  lines.push(' *         description: Unauthorized');
  lines.push(' *       403:');
  lines.push(' *         description: Forbidden');

  return lines.join('\n');
}

function generateTypeFromSchema(typeName: string, schema: Record<string, unknown>): string {
  const properties = Object.entries(schema)
    .map(([key, value]) => {
      const type = typeof value === 'string' ? value : 'unknown';
      return `  ${key}: ${mapToTypeScript(type)};`;
    })
    .join('\n');

  return `interface ${typeName} {
${properties}
}`;
}

function mapToTypeScript(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    integer: 'number',
    array: 'unknown[]',
    object: 'Record<string, unknown>',
  };
  return typeMap[type] || 'unknown';
}
