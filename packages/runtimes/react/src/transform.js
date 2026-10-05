import { transform } from "@babel/standalone";

export const transformReact = (
  code,
  {
    jsxRuntime = "automatic",
    importSource = "react",
  } = {},
) => {
  return transform(code, {
    plugins: [
      [
        "transform-react-jsx",
        {
          runtime: jsxRuntime,
          importSource,
        },
      ],
    ],
  }).code;
};