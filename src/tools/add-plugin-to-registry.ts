import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

interface AddPluginToRegistryArgs {
  pluginId: string;
  importPath?: string;
  runGenerate?: boolean;
}

const PROJECT_ROOT = process.cwd();

/**
 * Add a plugin to plugins/.registry.ts and optionally regenerate plugin imports.
 * importPath defaults to ../../plugins/{pluginId}/src for local plugins.
 */
export async function addPluginToRegistry(
  args: AddPluginToRegistryArgs
): Promise<string> {
  const {
    pluginId,
    importPath = `../../plugins/${pluginId}/src`,
    runGenerate = true,
  } = args;

  if (!pluginId || typeof pluginId !== "string") {
    return JSON.stringify({ success: false, error: "pluginId is required" });
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pluginId)) {
    return JSON.stringify({
      success: false,
      error: "pluginId must be kebab-case (e.g. my-plugin)",
    });
  }

  const registryPath = join(PROJECT_ROOT, "plugins", ".registry.ts");

  if (!existsSync(registryPath)) {
    return JSON.stringify({
      success: false,
      error: "plugins/.registry.ts not found",
    });
  }

  let content = readFileSync(registryPath, "utf-8");

  // Check if plugin already exists
  const pluginIdRegex = new RegExp(
    `pluginId:\\s*['"]${pluginId.replace(/-/g, "\\-")}['"]`,
    "i"
  );
  if (pluginIdRegex.test(content)) {
    return JSON.stringify({
      success: true,
      message: `Plugin "${pluginId}" is already in the registry`,
      registryPath,
      runGenerate: false,
    });
  }

  // Insert new plugin entry before ] as const;
  const newEntry = `  { pluginId: "${pluginId}", importPath: "${importPath}" },`;
  const arrayEndMatch = content.match(/(\s*)\]\s*as const;/);
  if (!arrayEndMatch) {
    return JSON.stringify({
      success: false,
      error: "Could not find registeredPlugins array in .registry.ts",
    });
  }

  const indent = arrayEndMatch[1];
  const insertion = `\n${newEntry}\n${indent}`;
  content = content.replace(/(\s*)\]\s*as const;/, `${insertion}] as const;`);

  writeFileSync(registryPath, content, "utf-8");

  let generateResult = "";
  if (runGenerate) {
    try {
      execSync("npm run generate:plugin-imports", {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      generateResult = "plugin-imports generated successfully";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return JSON.stringify(
        {
          success: true,
          message: `Plugin "${pluginId}" added to registry`,
          registryPath,
          generateError: `generate:plugin-imports failed: ${msg}`,
        },
        null,
        2
      );
    }
  }

  return JSON.stringify(
    {
      success: true,
      message: `Plugin "${pluginId}" added to registry`,
      registryPath,
      importPath,
      generateResult: runGenerate ? generateResult : "skipped (runGenerate=false)",
      nextSteps: [
        "Restart the API server to load the new plugin",
        "Rebuild the API if using Docker: docker compose build api",
      ],
    },
    null,
    2
  );
}
