import notebookViteResolver  from '@zikojs/notebook-vite-resolver'

export function notebookAstroResolver({
  packages = [],
  manifestFileName = "ziko-notebook-imports.json",
} = {}) {
  return {
    name: "zikojs:notebook-astro-resolver",

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
