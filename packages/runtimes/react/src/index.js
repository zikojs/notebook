
import { transform } from "sucrase";

export const ReactIdentifier = "react";

export const reactPlugin = () => ({
  name: ReactIdentifier,

  async transform(code, context) {
    if (context.runtime && context.runtime !== ReactIdentifier) {
      return code;
    }

    return transform(code, {
      transforms: ["jsx"],
      jsxRuntime: "automatic",
      jsxImportSource: "react",
      production: true,
    }).code;
  },
});
