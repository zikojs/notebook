import { transformImportsAndScope } from "./transform.js";

export const evaluateCodeAsync = async (
  code,
  TARGET,
  {
    importMap = {},
    plugins = [],
    runtime = null,
  } = {},
  scope,
) => {
  const validScope = scope || Object.create(null);

  // Auto-detect runtime if not explicitly passed by the cell
  let activeRuntime = runtime;
  
  if (!activeRuntime) {
    // 1. Check for explicit comment directive like `// @runtime svelte` or `// @runtime react`
    const commentMatch = code.match(/^\/\/\s*@?runtime[:\s]+([a-zA-Z0-9_-]+)/i);
    if (commentMatch) {
      activeRuntime = commentMatch[1].toLowerCase();
    } 
    // 2. Fallback heuristic: if code contains Svelte syntax indicators like <script> tags
    else if (code.includes("<script>") || code.includes("<style>") || /^\s*<[a-zA-Z-]+/m.test(code)) {
      // Check if svelte plugin exists, default to svelte if template tags are present
      if (plugins.some(p => p.name === "svelte")) {
        activeRuntime = "svelte";
      }
    }
  }

  const context = {
    TARGET,
    scope: validScope,
    importMap,
    plugins,
    runtime: activeRuntime,
  };

  // Find the plugin matching the active runtime
  const selectedPlugin = plugins.find(p => p.name === activeRuntime);

  // If the plugin handles its own evaluation (like Svelte compiling + dynamic import), run it exclusively
  if (selectedPlugin && selectedPlugin.evaluate) {
    return await selectedPlugin.evaluate(code, context);
  }

  let compiledCode = code;

  for (const plugin of plugins) {
    if (selectedPlugin && plugin.name !== activeRuntime) continue;
    if (plugin.transform) {
      compiledCode = await plugin.transform(compiledCode, context);
    }
  }

  compiledCode = transformImportsAndScope(compiledCode, importMap);

  const runCell = new Function(
    "TARGET",
    "__scope__",
    `
      return (async () => {
        with (__scope__) {
          ${compiledCode}
        }
      })();
    `,
  );

  let result = await runCell(TARGET, validScope);

  for (const plugin of plugins) {
    if (selectedPlugin && plugin.name !== activeRuntime) continue;
    if (plugin.afterEvaluate) {
      result = await plugin.afterEvaluate(result, context);
    }
  }

  return result;
};