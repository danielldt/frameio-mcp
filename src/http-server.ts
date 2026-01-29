#!/usr/bin/env node

import http from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { generateModule } from './tools/generate-module.js';
import { generateEntity } from './tools/generate-entity.js';
import { validateModule } from './tools/validate-module.js';
import { getExampleModule } from './tools/get-example-module.js';
import { getFrameworkGuide } from './resources/framework-guide.js';
import { getFieldTypes } from './resources/field-types.js';
import { getExample } from './resources/examples.js';
import { getBestPractices } from './resources/best-practices.js';
import { getModuleCreationGuide } from './prompts/module-creation.js';
import { getEntityDesignGuide } from './prompts/entity-design.js';
import { getValidationChecklist } from './prompts/validation-checklist.js';

class FrameIOMCPHTTPServer {
  private server: Server;
  private httpServer: http.Server;
  private handlers: Map<string, (request: any) => Promise<any>> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'frameio-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.httpServer = http.createServer(this.handleRequest.bind(this));
  }

  private setupHandlers() {
    // List available tools handler
    const listToolsHandler = async () => ({
      tools: [
        {
          name: 'generate_module',
          description: 'Generate complete module scaffolding with package.json, index.ts, tsconfig.json, and registry entry',
          inputSchema: {
            type: 'object',
            properties: {
              moduleId: {
                type: 'string',
                description: 'Kebab-case module identifier (e.g., my-module)',
              },
              displayName: {
                type: 'string',
                description: 'Human-readable module name (e.g., My Module)',
              },
              description: {
                type: 'string',
                description: 'Module description',
              },
              entities: {
                type: 'array',
                description: 'Array of entity definitions (optional)',
                items: { type: 'object' },
              },
              includeNavigation: {
                type: 'boolean',
                description: 'Generate navigation items (default: true)',
                default: true,
              },
              includeCommands: {
                type: 'boolean',
                description: 'Generate command palette entries (default: true)',
                default: true,
              },
            },
            required: ['moduleId', 'displayName', 'description'],
          },
        },
        {
          name: 'generate_entity',
          description: 'Generate entity definition code using defineEntity() builder',
          inputSchema: {
            type: 'object',
            properties: {
              entityKey: {
                type: 'string',
                description: 'Entity key in format {module-id}.{entity-name}',
              },
              name: {
                type: 'string',
                description: 'Singular entity name',
              },
              pluralName: {
                type: 'string',
                description: 'Plural entity name',
              },
              description: {
                type: 'string',
                description: 'Entity description',
              },
              fields: {
                type: 'array',
                description: 'Array of field definitions',
                items: { type: 'object' },
              },
              icon: {
                type: 'string',
                description: 'Lucide icon name (optional)',
              },
              views: {
                type: 'array',
                description: 'View configurations (table, kanban, etc.)',
                items: { type: 'object' },
              },
            },
            required: ['entityKey', 'name', 'pluralName', 'description', 'fields'],
          },
        },
        {
          name: 'validate_module',
          description: 'Validate module structure, code, and conventions',
          inputSchema: {
            type: 'object',
            properties: {
              modulePath: {
                type: 'string',
                description: 'Path to module directory (relative to project root)',
              },
              strict: {
                type: 'boolean',
                description: 'Enable strict validation (default: false)',
                default: false,
              },
            },
            required: ['modulePath'],
          },
        },
        {
          name: 'get_example_module',
          description: 'Fetch example code from existing modules',
          inputSchema: {
            type: 'object',
            properties: {
              moduleId: {
                type: 'string',
                description: 'Specific module to fetch (optional)',
              },
              feature: {
                type: 'string',
                description: 'Specific feature (entities, navigation, commands, etc.)',
              },
              pattern: {
                type: 'string',
                description: 'Pattern to match (e.g., reference-field, kanban-view)',
              },
            },
          },
        },
      ],
    });
    this.server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
    this.handlers.set('tools/list', listToolsHandler);

    // Handle tool calls handler
    const callToolHandler = async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_module':
            return {
              content: [
                {
                  type: 'text',
                  text: await generateModule(
                    args as {
                      moduleId: string;
                      displayName: string;
                      description: string;
                      entities?: any[];
                      includeNavigation?: boolean;
                      includeCommands?: boolean;
                    }
                  ),
                },
              ],
            };

          case 'generate_entity':
            return {
              content: [
                {
                  type: 'text',
                  text: await generateEntity(
                    args as {
                      entityKey: string;
                      name: string;
                      pluralName: string;
                      description: string;
                      fields: any[];
                      icon?: string;
                      views?: any[];
                    }
                  ),
                },
              ],
            };

          case 'validate_module':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await validateModule(
                      args as { modulePath: string; strict?: boolean }
                    ),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'get_example_module':
            return {
              content: [
                {
                  type: 'text',
                  text: await getExampleModule(
                    args as {
                      moduleId?: string;
                      feature?: string;
                      pattern?: string;
                    }
                  ),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    };
    this.server.setRequestHandler(CallToolRequestSchema, callToolHandler);
    this.handlers.set('tools/call', callToolHandler);

    // List available resources handler
    const listResourcesHandler = async () => ({
      resources: [
        {
          uri: 'frameio://framework-guide',
          name: 'FrameIO Framework Guide',
          description: 'Comprehensive framework documentation covering module structure, entities, fields, navigation, and best practices',
          mimeType: 'text/markdown',
        },
        {
          uri: 'frameio://field-types',
          name: 'Field Types Reference',
          description: 'Complete reference of all available field types with options, validation rules, and examples',
          mimeType: 'text/markdown',
        },
        {
          uri: 'frameio://examples/pos-bom',
          name: 'BOM Module Example',
          description: 'Example code from the pos-bom module',
          mimeType: 'text/typescript',
        },
        {
          uri: 'frameio://examples/module-rewards',
          name: 'Rewards Module Example',
          description: 'Comprehensive feature example from module-rewards',
          mimeType: 'text/typescript',
        },
        {
          uri: 'frameio://best-practices',
          name: 'Best Practices Guide',
          description: 'Naming conventions, design patterns, and module organization guidelines',
          mimeType: 'text/markdown',
        },
      ],
    });
    this.server.setRequestHandler(ListResourcesRequestSchema, listResourcesHandler);
    this.handlers.set('resources/list', listResourcesHandler);

    // Handle resource reads handler
    const readResourceHandler = async (request: any) => {
      const { uri } = request.params;

      try {
        let content: string;
        let mimeType: string;

        if (uri === 'frameio://framework-guide') {
          content = getFrameworkGuide();
          mimeType = 'text/markdown';
        } else if (uri === 'frameio://field-types') {
          content = getFieldTypes();
          mimeType = 'text/markdown';
        } else if (uri === 'frameio://best-practices') {
          content = getBestPractices();
          mimeType = 'text/markdown';
        } else if (uri.startsWith('frameio://examples/')) {
          const moduleId = uri.replace('frameio://examples/', '');
          content = await getExample(moduleId);
          mimeType = 'text/typescript';
        } else {
          throw new Error(`Unknown resource: ${uri}`);
        }

        return {
          contents: [
            {
              uri,
              mimeType,
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    };
    this.server.setRequestHandler(ReadResourceRequestSchema, readResourceHandler);
    this.handlers.set('resources/read', readResourceHandler);

    // List available prompts handler
    const listPromptsHandler = async () => ({
      prompts: [
        {
          name: 'module_creation_guide',
          description: 'Step-by-step guidance for creating a new FrameIO module',
          arguments: [
            {
              name: 'moduleId',
              description: 'Module ID (kebab-case)',
              required: false,
            },
            {
              name: 'displayName',
              description: 'Display name for the module',
              required: false,
            },
            {
              name: 'description',
              description: 'Module description',
              required: false,
            },
          ],
        },
        {
          name: 'entity_design_guide',
          description: 'Guidance for designing entities with proper fields, views, and permissions',
          arguments: [
            {
              name: 'entityName',
              description: 'Name of the entity',
              required: false,
            },
            {
              name: 'moduleId',
              description: 'Module ID this entity belongs to',
              required: false,
            },
          ],
        },
        {
          name: 'validation_checklist',
          description: 'Checklist for validating a module before completion',
          arguments: [
            {
              name: 'moduleId',
              description: 'Module ID to validate',
              required: false,
            },
          ],
        },
      ],
    });
    this.server.setRequestHandler(ListPromptsRequestSchema, listPromptsHandler);
    this.handlers.set('prompts/list', listPromptsHandler);

    // Handle prompt requests handler
    const getPromptHandler = async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        let prompt: { messages: Array<{ role: string; content: string }> };

        switch (name) {
          case 'module_creation_guide':
            prompt = getModuleCreationGuide(args as any);
            break;
          case 'entity_design_guide':
            prompt = getEntityDesignGuide(args as any);
            break;
          case 'validation_checklist':
            prompt = getValidationChecklist(args as any);
            break;
          default:
            throw new Error(`Unknown prompt: ${name}`);
        }

        return { messages: prompt.messages };
      } catch (error) {
        throw new Error(`Error getting prompt: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    this.server.setRequestHandler(GetPromptRequestSchema, getPromptHandler);
    this.handlers.set('prompts/get', getPromptHandler);
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'frameio-mcp' }));
      return;
    }

    const url = req.url || '/';
    const acceptHeader = req.headers.accept || '';
    const wantsSSE = acceptHeader.includes('text/event-stream') || url === '/sse';

    // Handle POST requests - MCP protocol over HTTP/SSE
    if (req.method === 'POST') {
      // For MCP HTTP/SSE, POST requests should always return SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const message = body ? JSON.parse(body) : {};
          const response = await this.handleMCPMessage(message);
          res.write(`data: ${JSON.stringify(response)}\n\n`);
          res.end();
        } catch (error) {
          res.write(`data: ${JSON.stringify({ 
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: error instanceof Error ? error.message : String(error)
            }
          })}\n\n`);
          res.end();
        }
      });

      return;
    }

    // Handle GET requests - SSE connection establishment
    if (req.method === 'GET' && (url === '/' || url === '/sse')) {
      // Always return SSE for GET requests to root or /sse
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // Send initial connection message
      res.write('data: {"type":"connection","status":"connected"}\n\n');

      // Keep connection alive
      const keepAlive = setInterval(() => {
        try {
          res.write(': keep-alive\n\n');
        } catch (e) {
          // Connection closed
          clearInterval(keepAlive);
        }
      }, 30000);

      req.on('close', () => {
        clearInterval(keepAlive);
        res.end();
      });

      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private async handleMCPMessage(message: any): Promise<any> {
    try {
      // Handle MCP protocol messages
      if (message.method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'frameio-mcp',
              version: '1.0.0',
            },
          },
        };
      }

      // Route to stored handlers
      const handler = this.handlers.get(message.method);
      if (handler) {
        const result = await handler({ params: message.params || {} });
        return {
          jsonrpc: '2.0',
          id: message.id,
          result,
        };
      }

      throw new Error(`Unknown method: ${message.method}`);
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async listen(port: number = 3000) {
    return new Promise<void>((resolve) => {
      this.httpServer.listen(port, () => {
        console.log(`FrameIO MCP HTTP server running on port ${port}`);
        resolve();
      });
    });
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 3000;
  const server = new FrameIOMCPHTTPServer();
  server.listen(port).catch(console.error);
}

export { FrameIOMCPHTTPServer };
