import { transform } from "@babel/standalone";

export const transformSolid = (code) =>
  transform(code, {
    plugins: [
      [
        "transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "solid-js",
        },
      ],
    ],
  }).code;

export const SolidIdentifier = "solid";

export const solidPlugin = () => ({
  name: SolidIdentifier,

  async transform(code, context) {
    if (context.runtime && context.runtime !== SolidIdentifier) {
      return code;
    }

    return transformSolid(code);
  },
});
