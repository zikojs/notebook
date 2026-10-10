import { transformPreact } from "./transform.js";
export const ReacIdentifier = 'preact'

export const preactPlugin = ({
  jsxRuntime = "automatic",
  importSource = "preact",
} = {}) => ({
  name: ReacIdentifier,

  async transform(code, context) {
    // CRITICAL: Only transform if this cell's runtime is explicitly "react"
    if (context.runtime && context.runtime !== "preact") {
      return code;
    }
    return transformPreact(code, { jsxRuntime, importSource });
  },

  // async afterEvaluate(result, context) {
  //   if (context.runtime && context.runtime !== "react") {
  //     return result;
  //   }
  //   // ... rest of React afterEvaluate logic
  // }

});