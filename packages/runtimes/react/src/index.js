import { transform } from "sucrase";
import { javascript } from '@codemirror/lang-javascript'

export const ReactIdentifier = "react";

export const reactPlugin = () => ({
  name: ReactIdentifier,
  language: javascript({ jsx: true }),

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
