import { transform } from "@babel/standalone";

export const transformPreact = (code) =>
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