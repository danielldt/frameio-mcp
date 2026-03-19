/**
 * Canonical FrameIO design philosophy and platform architecture.
 * Single source of truth for AI and human authors when creating modules or plugins.
 */

export function getArchitecture(): string {
  return `# FrameIO Design Philosophy & Platform Architecture

This document is the **canonical** reference for how the platform is designed. When creating modules or plugins, follow these rules so generated code stays consistent with the platform.

---

## 1. Design Philosophy

### Registration-based, no domain in core
- **Core** has no domain-specific logic. No hardcoded entity keys (e.g. \`rewards.*\`), no domain-specific API routes, no domain-specific widget keys in core services.
- **Everything extensible** is registration-based: modules register entities, permissions, navigation, commands; plugins register routes, migrations, sidebar items, and **widget data providers**.
- **Permissions** for modules come from the **Module Registry** (\`ModuleRegistry.getPermissions()\`). Seed and role setup must derive permission keys from the registry, not from a hardcoded list of domain modules.

### Modules vs plugins (strict split)
| Aspect | Module | Plugin |
|--------|--------|--------|
| **Purpose** | Domain data & workflows (products, orders, BOM, rewards) | Platform extensions (auth, integrations, automation, dashboards) |
| **UI** | Own pages, widgets (via widget definitions), entity views | Can modify sidebar, header, login, bottom nav; own pages |
| **Data / API** | No custom backend routes. Data via platform’s **generic** entity CRUD API. | **Own** backend routes and DB tables (\`plugin_*\`); receives \`PluginApiDeps\` in \`createRouter(deps)\`. |
| **Widget data** | Does **not** provide custom widget data (modules run in browser; backend widget data is plugin-only). | **Only** plugins provide custom widget data via \`deps.registerWidgetDataProvider(widgetKey, provider)\`. |
| **Registry** | \`modules/.registry.ts\` | \`plugins/.registry.ts\` |

### Summary rules
1. **Core**: Generic only. No domain keys in core API or core widget-data service.
2. **Modules**: UI + metadata (entities, permissions, nav, commands). Data via generic API.
3. **Plugins**: API + UI + optional widget data. Self-contained; use \`createRouter(deps)\` and \`PluginApiDeps\`; never rely on core importing plugin-specific symbols.
4. **Seed / permissions**: Derive from \`ModuleRegistry.getPermissions()\` (and plugin permissions from plugin registry), not hardcoded domain lists.

---

## 2. Platform Architecture

### Core API
- **Entity CRUD**: Generic endpoints driven by entity metadata from the module registry. No domain-specific endpoints in core.
- **Permissions**: Loaded from module registry and plugin registrations. Used for authz and for seeding roles (e.g. Manager/Staff).
- **Widget data**: Core service **aggregates** data from plugin-registered providers only. No core-owned domain widget keys.

### Module layer
- **Modules** export a single module object (e.g. \`myModuleModule\`) built with \`createModule()\`.
- They define entities (\`defineEntity()\`), permissions, navigation, commands, pages, widgets (widget **definitions** only; data comes from plugins if custom).
- They do **not** register backend routes or widget data providers.

### Plugin layer
- **Plugins** export a plugin object built with \`createPlugin()\` and optionally export a **route factory** \`createRouter(deps)\`.
- **Backend routes**: The platform loads \`routes.ts\`, calls \`createRouter(deps)\` (or uses default export), and mounts the returned Express Router. Plugins must **not** use \`registerRoutes(router: Router)\`; they must export \`createRouter(deps: PluginApiDeps)\` and use \`deps.db.query\` / \`deps.db.getClient\` for DB access. Types: import \`PluginApiDeps\` from \`@frameio/sdk\`.
- **Widget data**: If a plugin owns a widget that needs custom server-side data, it must call \`deps.registerWidgetDataProvider(widgetKey, provider)\` from within \`createRouter(deps)\`. The provider signature is \`(tenantId, widget, props, filters?) => Promise<unknown>\`.

### Build contract for plugins
- Use \`tsconfig.build.json\` for backend compilation (output to \`dist/\`) when the API loads plugin routes.
- Do **not** import \`PluginApiDeps\` or backend-only types from \`@frameio/shared\` in route files; use \`@frameio/sdk\` so the plugin builds against the same contract the API uses.
- Type all route handlers: avoid implicit \`any\` in \`createRouter\` and in callback parameters (e.g. \`req\`, \`res\`).

### Plugin background workers
- Plugins that need **background workers** (scheduled jobs, event handlers, escalation runners, etc.) must export \`startBackgroundWorkers(deps: PluginApiDeps): void\` from \`routes.ts\`.
- The platform calls \`startBackgroundWorkers\` for each plugin that exports it. Workers run either **embedded** (in the API process) or **standalone** (in a separate runner container), controlled by \`RUNNER_MODE\` (embedded | standalone | none).
- A single **unified runner** process loads all plugins and starts workers for each; the runner is generic, not tied to any specific plugin.
- Examples: \`data-orchestrator\` (execution, schedule, event runners), \`approvals\` (escalation, event-trigger handlers).

---

## 3. What AI / MCP Must Enforce

When generating or validating:

1. **Modules**: No \`createRouter\`, no \`registerWidgetDataProvider\`, no custom backend routes. Permissions and seed data derived from registry.
2. **Plugins**: Backend routes use \`createRouter(deps: PluginApiDeps)\`; use \`deps.db\` (and optionally \`deps.registerWidgetDataProvider\`); no \`registerRoutes(router)\`; explicit types; \`tsconfig.build.json\` present.
3. **Core / seed**: No hardcoded domain permission keys or widget keys; use \`ModuleRegistry.getPermissions()\` and plugin registry for permissions.
4. **Widget data**: Custom widget data only via plugins’ \`registerWidgetDataProvider\`; never in core or modules.
5. **Background workers**: Plugins with workers export \`startBackgroundWorkers(deps)\` from \`routes.ts\`; the platform or runner calls it. Use \`RUNNER_MODE\` to control embedded vs standalone.
`;
}
