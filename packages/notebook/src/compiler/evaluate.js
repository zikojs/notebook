import {
  transformImportsAndScope,
} from "./transform.js";

export const evaluateCodeAsync = async (
  code,
  TARGET,
  {
    importMap = {},
    plugins = [],
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
  };

  let compiledCode = code;

  for (const plugin of plugins) {
    if (plugin.transform) {
      compiledCode = await plugin.transform(
        compiledCode,
        context,
      );
    }
  }

  compiledCode = transformImportsAndScope(
    compiledCode,
    importMap,
  );

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

  let result = await runCell(
    TARGET,
    validScope,
  );

  for (const plugin of plugins) {
    if (plugin.afterEvaluate) {
      result = await plugin.afterEvaluate(
        result,
        context,
      );
    }
  }

  return result;
};