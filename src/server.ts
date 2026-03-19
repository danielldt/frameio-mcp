#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Existing tools
import { generateModule } from "./tools/generate-module.js";
import { generateEntity } from "./tools/generate-entity.js";
import { validateModule } from "./tools/validate-module.js";
import { getExampleModule } from "./tools/get-example-module.js";

// Phase 1: High Priority Tools
import { generateWorkflow } from "./tools/generate-workflow.js";
import { generatePage } from "./tools/generate-page.js";
import { generateWidget } from "./tools/generate-widget.js";
import { generateNavigation } from "./tools/generate-navigation.js";
import { analyzeModule } from "./tools/analyze-module.js";

// Phase 2: Medium Priority Tools
import { generateMigration } from "./tools/generate-migration.js";
import { generateTest } from "./tools/generate-test.js";
import { fixModule } from "./tools/fix-module.js";
import { generateApiEndpoint } from "./tools/generate-api-endpoint.js";
import { generateHook } from "./tools/generate-hook.js";

// Phase 3: Low Priority Tools
import { generateStorybookStory } from "./tools/generate-storybook-story.js";
import { generateDocumentation } from "./tools/generate-documentation.js";
import { checkDependencies } from "./tools/check-dependencies.js";
import { generateSeedData } from "./tools/generate-seed-data.js";

// Plugin Tools
import { generatePlugin } from "./tools/generate-plugin.js";
import { generatePluginMigration } from "./tools/generate-plugin-migration.js";
import { validatePluginTool } from "./tools/validate-plugin.js";
import { addPluginToRegistry } from "./tools/add-plugin-to-registry.js";

// Resources
import { getFrameworkGuide } from "./resources/framework-guide.js";
import { getFieldTypes } from "./resources/field-types.js";
import { getExample } from "./resources/examples.js";
import { getBestPractices } from "./resources/best-practices.js";
import { getPluginGuide } from "./resources/plugin-guide.js";
import { getArchitecture } from "./resources/architecture.js";

// Prompts
import { getModuleCreationGuide } from "./prompts/module-creation.js";
import { getEntityDesignGuide } from "./prompts/entity-design.js";
import { getValidationChecklist } from "./prompts/validation-checklist.js";
import { getPluginCreationGuide } from "./prompts/plugin-creation.js";

const PROJECT_ROOT = process.cwd();

class FrameIOMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "frameio-mcp",
        version: "2.0.0",
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
        // ============================================
        // EXISTING TOOLS
        // ============================================
        {
          name: "generate_module",
          description:
            "Generate complete module scaffolding with package.json, index.ts, tsconfig.json, and registry entry",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Kebab-case module identifier (e.g., my-module)",
              },
              displayName: {
                type: "string",
                description: "Human-readable module name (e.g., My Module)",
              },
              description: {
                type: "string",
                description: "Module description",
              },
              entities: {
                type: "array",
                description: "Array of entity definitions (optional)",
                items: { type: "object" },
              },
              includeNavigation: {
                type: "boolean",
                description: "Generate navigation items (default: true)",
                default: true,
              },
              includeCommands: {
                type: "boolean",
                description: "Generate command palette entries (default: true)",
                default: true,
              },
            },
            required: ["moduleId", "displayName", "description"],
          },
        },
        {
          name: "generate_entity",
          description:
            "Generate entity definition code using defineEntity() builder",
          inputSchema: {
            type: "object",
            properties: {
              entityKey: {
                type: "string",
                description: "Entity key in format {module-id}.{entity-name}",
              },
              name: {
                type: "string",
                description: "Singular entity name",
              },
              pluralName: {
                type: "string",
                description: "Plural entity name",
              },
              description: {
                type: "string",
                description: "Entity description",
              },
              fields: {
                type: "array",
                description: "Array of field definitions",
                items: { type: "object" },
              },
              icon: {
                type: "string",
                description: "Lucide icon name (optional)",
              },
              views: {
                type: "array",
                description: "View configurations (table, kanban, etc.)",
                items: { type: "object" },
              },
            },
            required: [
              "entityKey",
              "name",
              "pluralName",
              "description",
              "fields",
            ],
          },
        },
        {
          name: "validate_module",
          description: "Validate module structure, code, and conventions",
          inputSchema: {
            type: "object",
            properties: {
              modulePath: {
                type: "string",
                description:
                  "Path to module directory (relative to project root)",
              },
              strict: {
                type: "boolean",
                description: "Enable strict validation (default: false)",
                default: false,
              },
            },
            required: ["modulePath"],
          },
        },
        {
          name: "get_example_module",
          description: "Fetch example code from existing modules",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Specific module to fetch (optional)",
              },
              feature: {
                type: "string",
                description:
                  "Specific feature (entities, navigation, commands, etc.)",
              },
              pattern: {
                type: "string",
                description:
                  "Pattern to match (e.g., reference-field, kanban-view)",
              },
            },
          },
        },

        // ============================================
        // PHASE 1: HIGH PRIORITY TOOLS
        // ============================================
        {
          name: "generate_workflow",
          description:
            "Generate workflow definitions with states, transitions, and approvals using defineWorkflow() builder",
          inputSchema: {
            type: "object",
            properties: {
              workflowKey: {
                type: "string",
                description:
                  "Workflow key in format {module-id}.{workflow-name} (e.g., pos.order-approval)",
              },
              name: {
                type: "string",
                description: "Workflow display name",
              },
              description: {
                type: "string",
                description: "Workflow description",
              },
              entityKey: {
                type: "string",
                description:
                  "Entity key this workflow applies to (e.g., pos.order)",
              },
              statusField: {
                type: "string",
                description:
                  "Field name that stores the workflow status (e.g., status)",
              },
              states: {
                type: "array",
                description: "Array of workflow states",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    name: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["initial", "intermediate", "final", "cancelled"],
                    },
                    color: { type: "string" },
                  },
                  required: ["key", "name", "type"],
                },
              },
              transitions: {
                type: "array",
                description: "Array of state transitions",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    name: { type: "string" },
                    from: {
                      oneOf: [
                        { type: "string" },
                        { type: "array", items: { type: "string" } },
                      ],
                    },
                    to: { type: "string" },
                    permission: { type: "string" },
                    requiresApproval: { type: "boolean" },
                    approvalConfig: { type: "object" },
                  },
                  required: ["key", "name", "from", "to", "permission"],
                },
              },
            },
            required: [
              "workflowKey",
              "name",
              "description",
              "entityKey",
              "statusField",
              "states",
              "transitions",
            ],
          },
        },
        {
          name: "generate_page",
          description:
            "Generate custom page components with SDK integration and routing",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Module ID (kebab-case)",
              },
              pageKey: {
                type: "string",
                description: "Page key identifier (e.g., sales-dashboard)",
              },
              pageName: {
                type: "string",
                description:
                  "Display name for the page (e.g., Sales Dashboard)",
              },
              path: {
                type: "string",
                description: "Route path for the page (e.g., /sales/dashboard)",
              },
              componentName: {
                type: "string",
                description:
                  "React component name (PascalCase, e.g., SalesDashboard)",
              },
              permission: {
                type: "string",
                description: "Permission required to view page (optional)",
              },
              icon: {
                type: "string",
                description: "Lucide icon name (optional)",
              },
              description: {
                type: "string",
                description: "Page description (optional)",
              },
            },
            required: [
              "moduleId",
              "pageKey",
              "pageName",
              "path",
              "componentName",
            ],
          },
        },
        {
          name: "generate_widget",
          description:
            "Generate dashboard widget definitions (stat, table, list, chart, or custom)",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Module ID (kebab-case)",
              },
              widgetKey: {
                type: "string",
                description: "Widget key in format {module-id}.{widget-name}",
              },
              widgetName: {
                type: "string",
                description: "Widget display name",
              },
              widgetType: {
                type: "string",
                description: "Widget type",
                enum: ["stat", "table", "list", "chart", "custom"],
              },
              description: {
                type: "string",
                description: "Widget description",
              },
              entityKey: {
                type: "string",
                description: "Entity key for data binding (optional)",
              },
              propsSchema: {
                type: "object",
                description: "Widget props schema (optional)",
              },
              defaultProps: {
                type: "object",
                description: "Default prop values (optional)",
              },
              permissions: {
                type: "array",
                description: "Required permissions (optional)",
                items: { type: "string" },
              },
              componentName: {
                type: "string",
                description:
                  "Custom component name for custom widgets (optional)",
              },
            },
            required: [
              "moduleId",
              "widgetKey",
              "widgetName",
              "widgetType",
              "description",
            ],
          },
        },
        {
          name: "generate_navigation",
          description:
            "Generate navigation sections and items for sidebar and mobile navigation",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Module ID (kebab-case)",
              },
              section: {
                type: "object",
                description: "Navigation section (optional)",
                properties: {
                  key: { type: "string" },
                  name: { type: "string" },
                  icon: { type: "string" },
                  order: { type: "number" },
                },
              },
              items: {
                type: "array",
                description: "Navigation items",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    label: { type: "string" },
                    icon: { type: "string" },
                    path: { type: "string" },
                    placement: {
                      type: "string",
                      enum: ["sidebar", "bottom-navbar", "both"],
                    },
                    permission: { type: "string" },
                    order: { type: "number" },
                  },
                  required: ["key", "label", "icon", "path", "placement"],
                },
              },
            },
            required: ["moduleId", "items"],
          },
        },
        {
          name: "analyze_module",
          description:
            "Analyze module for issues, unused code, missing relationships, and best practice violations",
          inputSchema: {
            type: "object",
            properties: {
              modulePath: {
                type: "string",
                description:
                  "Path to module directory (relative to project root)",
              },
              checks: {
                type: "array",
                description:
                  "Specific checks to run (optional, runs all by default)",
                items: { type: "string" },
              },
            },
            required: ["modulePath"],
          },
        },

        // ============================================
        // PHASE 2: MEDIUM PRIORITY TOOLS
        // ============================================
        {
          name: "generate_migration",
          description: "Generate database migration scripts for schema changes",
          inputSchema: {
            type: "object",
            properties: {
              migrationName: {
                type: "string",
                description:
                  "Migration name in snake_case (e.g., add_discount_to_products)",
              },
              changes: {
                type: "array",
                description: "Array of schema changes",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "add_field",
                        "remove_field",
                        "add_index",
                        "remove_index",
                        "modify_field",
                      ],
                    },
                    entityKey: { type: "string" },
                    field: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        type: { type: "string" },
                        options: { type: "object" },
                      },
                    },
                    index: {
                      type: "object",
                      properties: {
                        fields: { type: "array", items: { type: "string" } },
                        unique: { type: "boolean" },
                      },
                    },
                  },
                  required: ["type", "entityKey"],
                },
              },
            },
            required: ["migrationName", "changes"],
          },
        },
        {
          name: "generate_test",
          description:
            "Generate Vitest test files for modules, entities, workflows, pages, or widgets",
          inputSchema: {
            type: "object",
            properties: {
              modulePath: {
                type: "string",
                description: "Path to module directory",
              },
              testType: {
                type: "string",
                description: "Type of test to generate",
                enum: ["entity", "workflow", "page", "widget"],
              },
              targetKey: {
                type: "string",
                description:
                  "Target key (entity key, workflow key, page key, or widget key)",
              },
            },
            required: ["modulePath", "testType"],
          },
        },
        {
          name: "fix_module",
          description:
            "Auto-fix common module issues like naming conventions, imports, and exports",
          inputSchema: {
            type: "object",
            properties: {
              modulePath: {
                type: "string",
                description: "Path to module directory",
              },
              fixes: {
                type: "array",
                description:
                  "Specific fixes to apply (optional, applies all by default)",
                items: { type: "string" },
              },
              dryRun: {
                type: "boolean",
                description: "Preview changes without applying (default: true)",
                default: true,
              },
            },
            required: ["modulePath"],
          },
        },
        {
          name: "generate_api_endpoint",
          description:
            "Generate custom API endpoints with Express route handlers and Swagger documentation",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Module ID (kebab-case)",
              },
              endpointPath: {
                type: "string",
                description: "API endpoint path (e.g., /process-payment)",
              },
              method: {
                type: "string",
                description: "HTTP method",
                enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
              },
              handlerName: {
                type: "string",
                description: "Handler function name (camelCase)",
              },
              description: {
                type: "string",
                description: "Endpoint description",
              },
              permissions: {
                type: "array",
                description: "Required permissions (optional)",
                items: { type: "string" },
              },
              requestSchema: {
                type: "object",
                description: "Request body schema (optional)",
              },
              responseSchema: {
                type: "object",
                description: "Response schema (optional)",
              },
            },
            required: [
              "moduleId",
              "endpointPath",
              "method",
              "handlerName",
              "description",
            ],
          },
        },
        {
          name: "generate_hook",
          description: "Generate custom React hooks with SDK integration",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Module ID (kebab-case)",
              },
              hookName: {
                type: "string",
                description:
                  'Hook name (must start with "use", e.g., useOrderStatistics)',
              },
              description: {
                type: "string",
                description: "Hook description",
              },
              returnType: {
                type: "string",
                description: "TypeScript return type",
              },
              parameters: {
                type: "array",
                description: "Hook parameters (optional)",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    required: { type: "boolean" },
                  },
                  required: ["name", "type"],
                },
              },
              usesSDKHooks: {
                type: "array",
                description: "SDK hooks to use (optional)",
                items: { type: "string" },
              },
            },
            required: ["moduleId", "hookName", "description", "returnType"],
          },
        },

        // ============================================
        // PHASE 3: LOW PRIORITY TOOLS
        // ============================================
        {
          name: "generate_storybook_story",
          description: "Generate Storybook stories for component documentation",
          inputSchema: {
            type: "object",
            properties: {
              componentName: {
                type: "string",
                description: "Component name (PascalCase)",
              },
              componentPath: {
                type: "string",
                description: "Import path for the component",
              },
              category: {
                type: "string",
                description: "Storybook category (default: Components)",
              },
              props: {
                type: "array",
                description: "Component props for argTypes",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    defaultValue: {},
                    description: { type: "string" },
                    control: { type: "string" },
                  },
                  required: ["name", "type"],
                },
              },
            },
            required: ["componentName", "componentPath"],
          },
        },
        {
          name: "generate_documentation",
          description:
            "Auto-generate README.md and API documentation for a module",
          inputSchema: {
            type: "object",
            properties: {
              modulePath: {
                type: "string",
                description: "Path to module directory",
              },
              outputType: {
                type: "string",
                description: "Documentation type to generate",
                enum: ["readme", "api", "full"],
                default: "readme",
              },
            },
            required: ["modulePath"],
          },
        },
        {
          name: "check_dependencies",
          description:
            "Check for dependency conflicts, version mismatches, and missing packages",
          inputSchema: {
            type: "object",
            properties: {
              modulePath: {
                type: "string",
                description: "Path to module directory",
              },
              checkPeerDeps: {
                type: "boolean",
                description: "Check peer dependencies (default: true)",
                default: true,
              },
              checkOutdated: {
                type: "boolean",
                description: "Check for outdated packages (default: false)",
                default: false,
              },
            },
            required: ["modulePath"],
          },
        },
        {
          name: "generate_seed_data",
          description: "Generate seed data scripts for development and testing",
          inputSchema: {
            type: "object",
            properties: {
              moduleId: {
                type: "string",
                description: "Module ID (kebab-case)",
              },
              entities: {
                type: "array",
                description: "Entity seed configurations",
                items: {
                  type: "object",
                  properties: {
                    entityKey: { type: "string" },
                    count: { type: "number" },
                    fields: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          key: { type: "string" },
                          type: { type: "string" },
                          generator: {
                            type: "string",
                            enum: ["random", "sequential", "static", "faker"],
                          },
                          value: {},
                          options: { type: "object" },
                        },
                        required: ["key", "type"],
                      },
                    },
                    relationships: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          field: { type: "string" },
                          referenceEntityKey: { type: "string" },
                          strategy: {
                            type: "string",
                            enum: ["random", "first", "all"],
                          },
                        },
                      },
                    },
                  },
                  required: ["entityKey", "count", "fields"],
                },
              },
              tenantId: {
                type: "string",
                description: "Tenant ID for seed data (default: default)",
                default: "default",
              },
            },
            required: ["moduleId", "entities"],
          },
        },

        // ============================================
        // PLUGIN TOOLS
        // ============================================
        {
          name: "generate_plugin",
          description:
            "Generate complete plugin scaffolding with package.json, index.ts, tsconfig.json, migrations, routes, and registry entry",
          inputSchema: {
            type: "object",
            properties: {
              pluginId: {
                type: "string",
                description: "Kebab-case plugin identifier (e.g., my-plugin)",
              },
              displayName: {
                type: "string",
                description: "Human-readable plugin name (e.g., My Plugin)",
              },
              description: {
                type: "string",
                description: "Plugin description",
              },
              author: {
                type: "string",
                description:
                  "Plugin author (optional, default: FrameIO Developer)",
              },
              includeMigrations: {
                type: "boolean",
                description: "Generate database migration file (default: true)",
                default: true,
              },
              includeRoutes: {
                type: "boolean",
                description: "Generate backend route file (default: true)",
                default: true,
              },
              includeBackgroundWorkers: {
                type: "boolean",
                description:
                  "Generate startBackgroundWorkers stub for scheduled jobs, event handlers, or escalation logic (default: false)",
                default: false,
              },
              tables: {
                type: "array",
                description:
                  "Table definitions for migrations (optional, generates default items table if empty)",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Table name (without plugin prefix)",
                    },
                    columns: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          type: { type: "string" },
                          nullable: { type: "boolean" },
                          defaultValue: { type: "string" },
                        },
                        required: ["name", "type"],
                      },
                    },
                  },
                  required: ["name", "columns"],
                },
              },
              permissions: {
                type: "array",
                description:
                  "Custom permissions (optional, defaults to read/manage)",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["key", "name", "description"],
                },
              },
            },
            required: ["pluginId", "displayName", "description"],
          },
        },
        {
          name: "generate_plugin_migration",
          description:
            "Generate a new database migration for a specific plugin with table definitions",
          inputSchema: {
            type: "object",
            properties: {
              pluginId: {
                type: "string",
                description: "Kebab-case plugin identifier (e.g., my-plugin)",
              },
              version: {
                type: "string",
                description: "Migration version (e.g., 1.1.0)",
              },
              description: {
                type: "string",
                description:
                  "Description of the migration (e.g., Add settings table)",
              },
              tables: {
                type: "array",
                description: "Array of table definitions to create",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description:
                        "Table name (without plugin prefix, e.g., settings)",
                    },
                    columns: {
                      type: "array",
                      description: "Array of column definitions",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          type: { type: "string" },
                          nullable: { type: "boolean" },
                          defaultValue: { type: "string" },
                          primaryKey: { type: "boolean" },
                        },
                        required: ["name", "type"],
                      },
                    },
                    indexes: {
                      type: "array",
                      description: "Additional indexes (optional)",
                      items: {
                        type: "object",
                        properties: {
                          columns: { type: "array", items: { type: "string" } },
                          unique: { type: "boolean" },
                        },
                      },
                    },
                  },
                  required: ["name", "columns"],
                },
              },
            },
            required: ["pluginId", "version", "description", "tables"],
          },
        },
        {
          name: "validate_plugin",
          description:
            "Validate plugin structure, route contract (createRouter(deps)), build contract (tsconfig.build.json), and registry",
          inputSchema: {
            type: "object",
            properties: {
              pluginPath: {
                type: "string",
                description:
                  "Path to plugin directory (relative to project root, e.g. plugins/my-plugin)",
              },
              strict: {
                type: "boolean",
                description: "Enable strict validation (default: false)",
                default: false,
              },
            },
            required: ["pluginPath"],
          },
        },
        {
          name: "add_plugin_to_registry",
          description:
            "Add a plugin to plugins/.registry.ts and regenerate plugin-imports (apps/web plugin map). Use after generating a new plugin.",
          inputSchema: {
            type: "object",
            properties: {
              pluginId: {
                type: "string",
                description:
                  "Kebab-case plugin identifier (e.g. my-plugin)",
              },
              importPath: {
                type: "string",
                description:
                  "Import path for the plugin (default: ../../plugins/{pluginId}/src)",
              },
              runGenerate: {
                type: "boolean",
                description:
                  "Run npm run generate:plugin-imports after adding (default: true)",
                default: true,
              },
            },
            required: ["pluginId"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Existing tools
          case "generate_module":
            return {
              content: [
                {
                  type: "text",
                  text: await generateModule(args as any),
                },
              ],
            };

          case "generate_entity":
            return {
              content: [
                {
                  type: "text",
                  text: await generateEntity(args as any),
                },
              ],
            };

          case "validate_module":
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    await validateModule(args as any),
                    null,
                    2
                  ),
                },
              ],
            };

          case "get_example_module":
            return {
              content: [
                {
                  type: "text",
                  text: await getExampleModule(args as any),
                },
              ],
            };

          // Phase 1: High Priority Tools
          case "generate_workflow":
            return {
              content: [
                {
                  type: "text",
                  text: await generateWorkflow(args as any),
                },
              ],
            };

          case "generate_page":
            return {
              content: [
                {
                  type: "text",
                  text: await generatePage(args as any),
                },
              ],
            };

          case "generate_widget":
            return {
              content: [
                {
                  type: "text",
                  text: await generateWidget(args as any),
                },
              ],
            };

          case "generate_navigation":
            return {
              content: [
                {
                  type: "text",
                  text: await generateNavigation(args as any),
                },
              ],
            };

          case "analyze_module":
            return {
              content: [
                {
                  type: "text",
                  text: await analyzeModule(args as any),
                },
              ],
            };

          // Phase 2: Medium Priority Tools
          case "generate_migration":
            return {
              content: [
                {
                  type: "text",
                  text: await generateMigration(args as any),
                },
              ],
            };

          case "generate_test":
            return {
              content: [
                {
                  type: "text",
                  text: await generateTest(args as any),
                },
              ],
            };

          case "fix_module":
            return {
              content: [
                {
                  type: "text",
                  text: await fixModule(args as any),
                },
              ],
            };

          case "generate_api_endpoint":
            return {
              content: [
                {
                  type: "text",
                  text: await generateApiEndpoint(args as any),
                },
              ],
            };

          case "generate_hook":
            return {
              content: [
                {
                  type: "text",
                  text: await generateHook(args as any),
                },
              ],
            };

          // Phase 3: Low Priority Tools
          case "generate_storybook_story":
            return {
              content: [
                {
                  type: "text",
                  text: await generateStorybookStory(args as any),
                },
              ],
            };

          case "generate_documentation":
            return {
              content: [
                {
                  type: "text",
                  text: await generateDocumentation(args as any),
                },
              ],
            };

          case "check_dependencies":
            return {
              content: [
                {
                  type: "text",
                  text: await checkDependencies(args as any),
                },
              ],
            };

          case "generate_seed_data":
            return {
              content: [
                {
                  type: "text",
                  text: await generateSeedData(args as any),
                },
              ],
            };

          // Plugin Tools
          case "generate_plugin":
            return {
              content: [
                {
                  type: "text",
                  text: await generatePlugin(args as any),
                },
              ],
            };

          case "generate_plugin_migration":
            return {
              content: [
                {
                  type: "text",
                  text: await generatePluginMigration(args as any),
                },
              ],
            };

          case "validate_plugin":
            return {
              content: [
                {
                  type: "text",
                  text: await validatePluginTool(args as any),
                },
              ],
            };

          case "add_plugin_to_registry":
            return {
              content: [
                {
                  type: "text",
                  text: await addPluginToRegistry(args as any),
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
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
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
          uri: "frameio://architecture",
          name: "FrameIO Design Philosophy & Platform Architecture",
          description:
            "Canonical design philosophy and platform architecture: modules vs plugins, no domain in core, registration-based design, widget data from plugins only, route and build contracts",
          mimeType: "text/markdown",
        },
        {
          uri: "frameio://framework-guide",
          name: "FrameIO Framework Guide",
          description:
            "Comprehensive framework documentation covering module structure, entities, fields, navigation, and best practices",
          mimeType: "text/markdown",
        },
        {
          uri: "frameio://field-types",
          name: "Field Types Reference",
          description:
            "Complete reference of all available field types with options, validation rules, and examples",
          mimeType: "text/markdown",
        },
        {
          uri: "frameio://examples/pos-bom",
          name: "BOM Module Example",
          description: "Example code from the pos-bom module",
          mimeType: "text/typescript",
        },
        {
          uri: "frameio://examples/module-rewards",
          name: "Rewards Module Example",
          description: "Comprehensive feature example from module-rewards",
          mimeType: "text/typescript",
        },
        {
          uri: "frameio://best-practices",
          name: "Best Practices Guide",
          description:
            "Naming conventions, design patterns, and module/plugin organization guidelines",
          mimeType: "text/markdown",
        },
        {
          uri: "frameio://plugin-guide",
          name: "FrameIO Plugin Guide",
          description:
            "Comprehensive guide to plugin architecture, development, migrations, API routes, and management",
          mimeType: "text/markdown",
        },
      ],
    }));

    // Handle resource reads
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        try {
          let content: string;
          let mimeType: string;

          if (uri === "frameio://architecture") {
            content = getArchitecture();
            mimeType = "text/markdown";
          } else if (uri === "frameio://framework-guide") {
            content = getFrameworkGuide();
            mimeType = "text/markdown";
          } else if (uri === "frameio://field-types") {
            content = getFieldTypes();
            mimeType = "text/markdown";
          } else if (uri === "frameio://best-practices") {
            content = getBestPractices();
            mimeType = "text/markdown";
          } else if (uri === "frameio://plugin-guide") {
            content = getPluginGuide();
            mimeType = "text/markdown";
          } else if (uri.startsWith("frameio://examples/")) {
            const moduleId = uri.replace("frameio://examples/", "");
            content = await getExample(moduleId);
            mimeType = "text/typescript";
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
                mimeType: "text/plain",
                text: `Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          };
        }
      }
    );

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "module_creation_guide",
          description:
            "Step-by-step guidance for creating a new FrameIO module",
          arguments: [
            {
              name: "moduleId",
              description: "Module ID (kebab-case)",
              required: false,
            },
            {
              name: "displayName",
              description: "Display name for the module",
              required: false,
            },
            {
              name: "description",
              description: "Module description",
              required: false,
            },
          ],
        },
        {
          name: "entity_design_guide",
          description:
            "Guidance for designing entities with proper fields, views, and permissions",
          arguments: [
            {
              name: "entityName",
              description: "Name of the entity",
              required: false,
            },
            {
              name: "moduleId",
              description: "Module ID this entity belongs to",
              required: false,
            },
          ],
        },
        {
          name: "validation_checklist",
          description: "Checklist for validating a module before completion",
          arguments: [
            {
              name: "moduleId",
              description: "Module ID to validate",
              required: false,
            },
          ],
        },
        {
          name: "plugin_creation_guide",
          description:
            "Step-by-step guidance for creating a new FrameIO plugin with migrations and API routes",
          arguments: [
            {
              name: "pluginId",
              description: "Plugin ID (kebab-case)",
              required: false,
            },
            {
              name: "displayName",
              description: "Display name for the plugin",
              required: false,
            },
            {
              name: "description",
              description: "Plugin description",
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
          case "module_creation_guide":
            prompt = getModuleCreationGuide(args as any);
            break;
          case "entity_design_guide":
            prompt = getEntityDesignGuide(args as any);
            break;
          case "validation_checklist":
            prompt = getValidationChecklist(args as any);
            break;
          case "plugin_creation_guide":
            prompt = getPluginCreationGuide(args as any);
            break;
          default:
            throw new Error(`Unknown prompt: ${name}`);
        }

        return { messages: prompt.messages };
      } catch (error) {
        throw new Error(
          `Error getting prompt: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("FrameIO MCP server running on stdio");
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new FrameIOMCPServer();
  server.run().catch(console.error);
}
