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

  resolveImport(source) {
    const imports = {
      react: "https://esm.sh/react",
      "react-dom":
        "https://esm.sh/react-dom",
      "react/jsx-runtime":
        "https://esm.sh/react/jsx-runtime",
      "react/jsx-dev-runtime":
        "https://esm.sh/react/jsx-dev-runtime",
    };

    return imports[source];
  },
});