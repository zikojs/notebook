import { notebookViteResolver } from './vite-resolver.js'
// import path from "node:path";

// const ENDPOINT = "/__notebook_resolve";

export function notebookAstroResolver({
  packages = [],
  manifestFileName = "ziko-notebook-imports.json",
} = {}) {
  return {
    name: "zikojs:notebook-astro-resolver",

    // hooks: {
    //   "astro:config:setup"({ injectRoute }) {
    //     injectRoute({
    //       pattern: ENDPOINT,
    //       entrypoint: new URL("./resolver-endpoint.js", import.meta.url),
    //       prerender: false,
    //     });
    //   },
    // },

    vite: {
      plugins: [
        notebookViteResolver({
          packages,
          manifestFileName,
        }),
      ],
    },
  };
}
