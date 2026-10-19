
import { transform } from "sucrase";

export const PreactIdentifier = "preact";

export const preactPlugin = () => ({
  name: PreactIdentifier,

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
