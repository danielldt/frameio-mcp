# FrameIO MCP Server

Model Context Protocol (MCP) server for FrameIO module and plugin creation and validation. This server provides tools, resources, and prompts to help LLMs consistently build FrameIO modules and plugins.

## Features

- **Code Generation**: Generate complete module/plugin scaffolding and entity definitions
- **Validation**: Validate module structure, code, and conventions
- **Examples**: Access real-world examples from existing modules and plugins
- **Documentation**: Comprehensive framework documentation and best practices
- **Guidance**: Step-by-step prompts for module and plugin creation

## Installation

```bash
cd tools/frameio-mcp
npm install
npm run build
```

## Configuration

### Cursor Configuration

Add to your Cursor MCP settings (`.cursor/mcp.json` or Cursor settings):

```json
{
  "mcpServers": {
    "frameio": {
      "command": "node",
      "args": ["tools/frameio-mcp/dist/server.js"],
      "cwd": "."
    }
  }
}
```

### VS Code / Other Clients

Configure your MCP client to run:

```
node tools/frameio-mcp/dist/server.js
```

## Available Tools

### 1. `generate_module`

Generate complete module scaffolding.

**Parameters:**

- `moduleId` (string, required): Kebab-case module identifier
- `displayName` (string, required): Human-readable module name
- `description` (string, required): Module description
- `entities` (array, optional): Array of entity definitions
- `includeNavigation` (boolean, default: true): Generate navigation items
- `includeCommands` (boolean, default: true): Generate command palette entries

**Returns:** Complete module code structure including package.json, index.ts, tsconfig.json, and registry entry

### 2. `generate_entity`

Generate entity definition code.

**Parameters:**

- `entityKey` (string, required): Format `{module-id}.{entity-name}`
- `name` (string, required): Singular entity name
- `pluralName` (string, required): Plural entity name
- `description` (string, required): Entity description
- `fields` (array, required): Array of field definitions
- `icon` (string, optional): Lucide icon name
- `views` (array, optional): View configurations

**Returns:** Complete entity definition code using `defineEntity()` builder

### 3. `validate_module`

Validate module structure and code.

**Parameters:**

- `modulePath` (string, required): Path to module directory
- `strict` (boolean, default: false): Enable strict validation

**Returns:** Validation results with errors, warnings, and checks

### 4. `get_example_module`

Fetch example code from existing modules.

**Parameters:**

- `moduleId` (string, optional): Specific module to fetch
- `feature` (string, optional): Specific feature (entities, navigation, commands, etc.)
- `pattern` (string, optional): Pattern to match (e.g., "reference-field", "kanban-view")

**Returns:** Example code snippets from existing modules

### 5. `validate_plugin`

Validate plugin structure, route contract, and build contract.

**Parameters:**

- `pluginPath` (string, required): Path to plugin directory (e.g. `plugins/my-plugin`)
- `strict` (boolean, default: false): Enable strict validation

**Returns:** Validation results with checks for structure, exports, route contract (createRouter(deps), no registerRoutes), build contract (tsconfig.build.json), and registry

## Available Resources

### 1. `frameio://architecture`

**Design philosophy and platform architecture** (canonical reference for modules and plugins):

- Registration-based design; no domain in core
- Modules vs plugins (strict split): modules = UI + metadata; plugins = API + UI + widget data
- Core: generic only; permissions from registry; widget data from plugin providers only
- Plugin route contract: `createRouter(deps: PluginApiDeps)`; build contract: `tsconfig.build.json`, types from `@frameio/sdk`

Read this first when creating modules or plugins so generated code aligns with the platform.

### 2. `frameio://framework-guide`

Comprehensive framework documentation covering:

- Module structure and conventions
- Entity definition patterns
- Field types and options
- Navigation, commands, stat cards, quick links
- Custom pages
- Best practices

### 3. `frameio://field-types`

Complete reference of all available field types:

- String, text, number, decimal fields
- Boolean, date, datetime fields
- Email, phone, URL fields
- Select, multiselect fields
- Reference, location fields
- Currency, percentage, JSON fields

Each with options, validation rules, and examples.

### 4. `frameio://examples/{module-id}`

Example code from specific modules:

- `frameio://examples/pos-bom` - BOM module example
- `frameio://examples/module-rewards` - Comprehensive feature example
- `frameio://examples/pos-inventory` - Inventory module example

### 5. `frameio://best-practices`

Best practices guide:

- Naming conventions
- Entity design patterns
- Field selection guidelines
- Module organization
- Common patterns

## Available Prompts

### 1. `module_creation_guide`

Step-by-step guidance for creating a new module.

**Arguments:**

- `moduleId` (optional): Module ID
- `displayName` (optional): Display name
- `description` (optional): Description

### 2. `entity_design_guide`

Guidance for designing entities.

**Arguments:**

- `entityName` (optional): Name of the entity
- `moduleId` (optional): Module ID

### 3. `validation_checklist`

Checklist for validating a module.

**Arguments:**

- `moduleId` (optional): Module ID to validate

## Usage Examples

### Generate a Module

```
Use the generate_module tool with:
- moduleId: "my-module"
- displayName: "My Module"
- description: "A sample module"
```

### Generate an Entity

```
Use the generate_entity tool with:
- entityKey: "my-module.product"
- name: "Product"
- pluralName: "Products"
- description: "Product catalog items"
- fields: [
    { type: "string", key: "name", name: "Name", options: { required: true } },
    { type: "number", key: "price", name: "Price", options: { required: true } }
  ]
```

### Validate a Module

```
Use the validate_module tool with:
- modulePath: "modules/my-module"
- strict: true
```

### Validate a Plugin

```
Use the validate_plugin tool with:
- pluginPath: "plugins/my-plugin"
- strict: false
```

Validates structure, route contract (createRouter(deps), no registerRoutes), build contract (tsconfig.build.json), and registry.

### Get Examples

```
Use the get_example_module tool with:
- pattern: "kanban-view"
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev  # Watch mode
```

### Running

```bash
npm start
```

## Project Structure

```
tools/frameio-mcp/
├── src/
│   ├── server.ts              # MCP server entry point
│   ├── tools/                 # Tool implementations
│   │   ├── generate-module.ts
│   │   ├── generate-entity.ts
│   │   ├── validate-module.ts
│   │   └── get-example-module.ts
│   ├── resources/             # Resource implementations
│   │   ├── framework-guide.ts
│   │   ├── field-types.ts
│   │   ├── examples.ts
│   │   └── best-practices.ts
│   ├── prompts/               # Prompt templates
│   │   ├── module-creation.ts
│   │   ├── entity-design.ts
│   │   └── validation-checklist.ts
│   └── utils/                  # Utility functions
│       ├── code-generator.ts
│       ├── validator.ts
│       └── example-loader.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Integration with FrameIO Framework

This MCP server integrates with:

- **Module Registry**: Reads from `modules/.registry.ts` (auto-updated by CLI)
- **Plugin Registry**: Reads from `plugins/.registry.ts` (auto-updated by CLI)
- **Existing Modules**: Scans `modules/` directory for examples
- **Existing Plugins**: Scans `plugins/` directory for examples (Data Orchestrator, OAuth, Integrations)
- **SDK Types**: Uses types from `platform/sdk/`
- **CLI Tools**: Leverages code from `tools/frameio-cli/` (which auto-registers modules/plugins)
- **Dynamic Module/Plugin Loading**: Modules and plugins are discovered and loaded at runtime
- **Storybook**: Component development environment available at port 6006
- **Migration System**: Versioned database migrations with rollback support

## Plugin System

FrameIO includes a powerful plugin system that allows extending the platform's core functionality:

### Built-in Plugins

| Plugin              | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `data-orchestrator` | Visual data flow builder for connecting modules and orchestrating data pipelines |
| `oauth`             | OAuth authentication providers (Google, GitHub, Azure, etc.)                     |
| `integration`       | Third-party API access management with client credentials or API keys            |

### Plugin Capabilities

Plugins can:

- **Modify Core UI**: Add items to sidebar, header, and login page
- **Register Routes**: Create new pages within the application
- **Define Permissions**: Introduce new permission keys for access control
- **Add Backend Logic**: Register custom API endpoints and database tables
- **Theme Integration**: Automatically adapt to light/dark themes

### Plugin Structure

```
plugins/
├── .registry.ts          # Plugin registration
├── data-orchestrator/    # Visual data flow builder
│   ├── src/
│   │   ├── index.ts      # Plugin definition
│   │   ├── components/   # React components
│   │   └── types/        # TypeScript types
│   └── package.json
├── oauth/                # OAuth authentication
└── integration/          # Third-party integrations
```

### Creating a Plugin

1. Create directory: `plugins/my-plugin/src`
2. Add `package.json` with `@frameio/sdk` dependency
3. Create `src/index.ts` with plugin registration using `createPlugin()`
4. Add components in `src/components/`
5. Register in `plugins/.registry.ts`
6. Run `npm run dev` - imports are auto-generated!

## Troubleshooting

### Module Not Found

If examples aren't loading:

- Ensure modules exist in `modules/` directory
- Check that `src/index.ts` exists in each module
- Verify file permissions

### Plugin Not Found

If plugin examples aren't loading:

- Ensure plugins exist in `plugins/` directory
- Check that `src/index.ts` exists in each plugin
- Verify plugin is registered in `plugins/.registry.ts`

### Validation Errors

If validation fails:

- Check module structure matches conventions
- Verify export names follow camelCase convention
- Ensure entity keys follow format
- Check registry entry exists

### MCP Server Not Starting

If server won't start:

- Verify Node.js version >= 20.0.0
- Run `npm install` to install dependencies
- Run `npm run build` to compile TypeScript
- Check MCP client configuration

## License

Part of the FrameIO framework.
