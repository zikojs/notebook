import { transform } from "@babel/standalone";

const transformPreact = (code) =>
  transform(code, {
    plugins: [
      [
        "transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "preact",
        },
      ],
    ],
  }).code;

export const PreacIdentifier = 'preact'

export const preactPlugin = ({
  jsxRuntime = "automatic",
  importSource = "preact",
} = {}) => ({
  name: PreacIdentifier,

  async transform(code, context) {
    if (context.runtime && context.runtime !== "preact") {
      return code;
    }
    return transformPreact(code, { jsxRuntime, importSource });
  },

});