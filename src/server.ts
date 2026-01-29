#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

const PROJECT_ROOT = process.cwd();

class FrameIOMCPServer {
  private server: Server;

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
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
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
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
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
    }));

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
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
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FrameIO MCP server running on stdio');
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new FrameIOMCPServer();
  server.run().catch(console.error);
}
