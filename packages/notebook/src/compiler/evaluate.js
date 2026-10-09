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
  const validScope =
    scope || Object.create(null);

  const context = {
    TARGET,
    scope: validScope,
    importMap,
    plugins,
    runtime,
  };

  const selectedPlugin = plugins.find(
    p => p.name === runtime,
  );

  // Runtime-specific evaluator
  if (
    selectedPlugin &&
    selectedPlugin.evaluate
  ) {
    return await selectedPlugin.evaluate(
      code,
      context,
    );
  }

  let compiledCode = code;

  for (const plugin of plugins) {
    if (
      selectedPlugin &&
      plugin.name !== runtime
    ) {
      continue;
    }

    if (plugin.transform) {
      compiledCode = await plugin.transform(
        compiledCode,
        context,
      );
    }
  }

  compiledCode =
    transformImportsAndScope(
      compiledCode,
      importMap,
    );

  const runCell = new Function(
    "TARGET",
    "__scope__",
    `
    // Bind the active TARGET for this cell evaluation
    if (typeof __Ziko__ !== "undefined" && __Ziko__.__Config__) {
      __Ziko__.__Config__.default.target = TARGET;
      __Ziko__.__Config__.default.autoMount = true;
    }

    return (async () => {
      with (__scope__) {
        return await (async () => {
          ${compiledCode}
        })();
      }
    })();
    `,
  );

  let result = await runCell(
    TARGET,
    validScope,
  );

  for (const plugin of plugins) {
    if (
      selectedPlugin &&
      plugin.name !== runtime
    ) {
      continue;
    }

    if (plugin.afterEvaluate) {
      result = await plugin.afterEvaluate(
        result,
        context,
      );
    }
  }

  return result;
};