import { validatePlugin } from "../utils/plugin-validator.js";

interface ValidatePluginArgs {
  pluginPath: string;
  strict?: boolean;
}

export async function validatePluginTool(
  args: ValidatePluginArgs
): Promise<string> {
  const { pluginPath, strict = false } = args;
  const result = await validatePlugin(pluginPath, strict);
  return JSON.stringify(result, null, 2);
}
