import fs from "fs-extra";
import path from "path";

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    structure: boolean;
    exports: boolean;
    routeContract: boolean;
    buildContract: boolean;
    registry: boolean;
  };
}

export async function validatePlugin(
  pluginPath: string,
  strict: boolean = false
): Promise<PluginValidationResult> {
  const result: PluginValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    checks: {
      structure: false,
      exports: false,
      routeContract: false,
      buildContract: false,
      registry: false,
    },
  };

  const fullPath = path.resolve(process.cwd(), pluginPath);
  const pluginId = path.basename(fullPath);

  // Check 1: Structure
  try {
    const packageJsonPath = path.join(fullPath, "package.json");
    const indexTsPath = path.join(fullPath, "src", "index.ts");
    const tsconfigPath = path.join(fullPath, "tsconfig.json");
    const tsconfigBuildPath = path.join(fullPath, "tsconfig.build.json");

    if (!(await fs.pathExists(packageJsonPath))) {
      result.errors.push("package.json not found");
      result.valid = false;
    } else {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.name !== `@frameio/${pluginId}`) {
        result.errors.push(
          `package.json name should be '@frameio/${pluginId}', found '${packageJson.name}'`
        );
        result.valid = false;
      }
      const deps = { ...packageJson.dependencies, ...packageJson.peerDependencies };
      if (!deps["@frameio/sdk"]) {
        result.errors.push("package.json must list @frameio/sdk as dependency or peerDependency");
        result.valid = false;
      }
    }

    if (!(await fs.pathExists(indexTsPath))) {
      result.errors.push("src/index.ts not found");
      result.valid = false;
    }
    if (!(await fs.pathExists(tsconfigPath))) {
      result.warnings.push("tsconfig.json not found (recommended)");
    }

    if (
      (await fs.pathExists(packageJsonPath)) &&
      (await fs.pathExists(indexTsPath)) &&
      !result.errors.some((e) => e.includes("package.json") || e.includes("index.ts") || e.includes("@frameio/sdk"))
    ) {
      result.checks.structure = true;
    }
  } catch (error) {
    result.errors.push(
      `Structure validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    result.valid = false;
  }

  // Check 2: Plugin export (createPlugin)
  try {
    const indexTsPath = path.join(fullPath, "src", "index.ts");
    if (await fs.pathExists(indexTsPath)) {
      const content = await fs.readFile(indexTsPath, "utf-8");
      if (!content.includes("createPlugin")) {
        result.errors.push("Plugin does not use createPlugin()");
        result.valid = false;
      } else {
        result.checks.exports = true;
      }
    }
  } catch (error) {
    result.errors.push(
      `Export validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    result.valid = false;
  }

  // Check 3: Route contract (createRouter(deps), PluginApiDeps from @frameio/sdk)
  const routesPath = path.join(fullPath, "src", "routes.ts");
  if (await fs.pathExists(routesPath)) {
    try {
      const routesContent = await fs.readFile(routesPath, "utf-8");
      const hasCreateRouter =
        routesContent.includes("createRouter") &&
        (routesContent.includes("deps: PluginApiDeps") || routesContent.includes("deps: import"));
      const hasNoRegisterRoutes = !routesContent.includes("registerRoutes(router");
      const hasPluginApiDepsFromSdk =
        routesContent.includes("PluginApiDeps") &&
        (routesContent.includes("from '@frameio/sdk'") || routesContent.includes('from "@frameio/sdk"'));

      if (!hasCreateRouter) {
        result.errors.push(
          "routes.ts must export createRouter(deps: PluginApiDeps). Do not use registerRoutes(router: Router)."
        );
        result.valid = false;
      }
      if (!hasNoRegisterRoutes) {
        result.errors.push("routes.ts must not use registerRoutes(router). Use createRouter(deps) instead.");
        result.valid = false;
      }
      if (hasCreateRouter && !hasPluginApiDepsFromSdk && routesContent.includes("PluginApiDeps")) {
        result.warnings.push("Import PluginApiDeps from '@frameio/sdk' in routes.ts for correct build contract.");
      }
      if (hasCreateRouter && hasNoRegisterRoutes) {
        result.checks.routeContract = true;
      }
    } catch (error) {
      result.errors.push(
        `Route contract check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.valid = false;
    }
  } else {
    result.checks.routeContract = true; // No routes file is valid
  }

  // Check 4: Build contract (tsconfig.build.json)
  const tsconfigBuildPath = path.join(fullPath, "tsconfig.build.json");
  if (await fs.pathExists(routesPath)) {
    if (!(await fs.pathExists(tsconfigBuildPath))) {
      result.warnings.push(
        "tsconfig.build.json not found. Required for backend compilation when plugin has routes."
      );
    } else {
      result.checks.buildContract = true;
    }
  } else {
    result.checks.buildContract = true;
  }

  // Check 5: Registry
  try {
    const registryPath = path.resolve(process.cwd(), "plugins", ".registry.ts");
    if (await fs.pathExists(registryPath)) {
      const registryContent = await fs.readFile(registryPath, "utf-8");
      if (!registryContent.includes(`'${pluginId}'`) && !registryContent.includes(`"${pluginId}"`)) {
        result.warnings.push(
          `Plugin not found in plugins/.registry.ts. Add: { pluginId: '${pluginId}', importPath: '...' }`
        );
      } else {
        result.checks.registry = true;
      }
    } else {
      result.warnings.push("plugins/.registry.ts not found");
    }
  } catch {
    result.warnings.push("Registry check failed");
  }

  return result;
}
