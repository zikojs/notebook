import { transformReact } from "./transform.js";

export const reactPlugin = ({
  jsxRuntime = "automatic",
  importSource = "react",
} = {}) => ({
  name: "react",

  transform(code) {
    return transformReact(code, {
      jsxRuntime,
      importSource,
    });
  },

});