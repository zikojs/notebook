import { transform } from "sucrase";
import { javascript } from '@codemirror/lang-javascript'

export const PreactIdentifier = "preact";

export const preactPlugin = () => ({
  name: PreactIdentifier,
  language: javascript({ jsx: true }),

  async transform(code, context) {
    if (context.runtime && context.runtime !== PreactIdentifier) {
      return code;
    }

    return transform(code, {
      transforms: ["jsx"],
      jsxRuntime: "automatic",
      jsxImportSource: "preact",
      production: true,
    }).code;
  },
});
