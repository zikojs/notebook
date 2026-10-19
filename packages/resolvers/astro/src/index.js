import notebookViteResolver  from '@zikojs/notebook-vite-resolver'

export default function notebookAstroResolver({
  modules = [],
  manifestFileName = "ziko-notebook-imports.json",
} = {}) {
  return {
    name: "zikojs:notebook-astro-resolver",

    vite: {
      plugins: [
        notebookViteResolver({
          modules,
          manifestFileName,
        }),
      ],
    },
  };
}
