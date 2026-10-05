import { transformReact } from "./transform.js";
export const ReacIdentifier = 'react'

export const reactPlugin = ({
  jsxRuntime = "automatic",
  importSource = "react",
} = {}) => ({
  name: ReacIdentifier,

  async transform(code, context) {
    // CRITICAL: Only transform if this cell's runtime is explicitly "react"
    if (context.runtime && context.runtime !== "react") {
      return code;
    }
    return transformReact(code, { jsxRuntime, importSource });
  },

  // async afterEvaluate(result, context) {
  //   if (context.runtime && context.runtime !== "react") {
  //     return result;
  //   }
  //   // ... rest of React afterEvaluate logic
  // }

});