import { transformImportsAndScope } from "./transform.js";
import { Console as _Console } from '@zikojs/console/no-css'
import { tags } from 'ziko/dom'
const { div } = tags

const Console = {
  log : (...args) => div(_Console.log(...args)),
  table : (...args) => div(_Console.table(...args)),
  warn : (...args) => div(_Console.warn(...args)),
  error : (...args) => div(_Console.error(...args))
}

export const evaluateCodeAsync = async (
  code,
  TARGET,
  {
    importMap = {},
    plugins = [],
    runtime = null,
    cdnFallback = true,
  } = {},
  scope,
) => {
  const validScope = scope || Object.create(null);
  const importScope = Object.create(null);

  validScope.console = Console;

  const context = {
    TARGET,
    scope: validScope,
    importMap,
    plugins,
    runtime,
    cdnFallback
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

  compiledCode = await transformImportsAndScope(
  compiledCode,
  {
    importMap,
    plugins,
    cdnFallback,
    importScopeIdentifier: "__imports__",
  },
);
// console.log(compiledCode)

  const runCell = new Function(
    "TARGET",
    "__scope__",
    "__imports__",
    `
    // Bind the active TARGET for this cell evaluation
    if (typeof __Ziko__ !== "undefined" && __Ziko__.__Config__) {
      __Ziko__.__Config__.default.target = TARGET;
      __Ziko__.__Config__.default.autoMount = true;
    }



    return (async () => {
      with (__scope__) {
        return await (async () => {
          with (__imports__) {
            ${compiledCode}
          }
        })();
        }
    })();
    `,
  );

  let result = await runCell(
    TARGET,
    validScope,
    importScope,
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