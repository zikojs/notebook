import { transformReact } from "./transform.js";
export const ReacIdentifier = 'svelte'

export const reactPlugin = ({
  jsxRuntime = "automatic",
  importSource = "react",
} = {}) => ({
  name: ReacIdentifier,

  transform(code) {
    return transformReact(code, {
      jsxRuntime,
      importSource,
    });
  },

});