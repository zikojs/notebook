import { compile } from "svelte/compiler";
import { mount, unmount } from "https://esm.sh/svelte";

export const SvelteIdentifier = 'svelte'
export const sveltePlugin = ({
  runes = true,
} = {}) => ({
  name: SvelteIdentifier,

  async evaluate(code, context) {
    const { TARGET } = context;
    if (!TARGET) return;

    try {
      // 1. Compile Svelte code
      const result = compile(code, {
        filename: "Component.svelte",
        runes,
        css: "injected",
      });

      let jsCode = result.js.code;

      // 2. Rewrite bare svelte imports in the compiled code to full esm.sh URLs
      jsCode = jsCode.replace(
        /from\s+['"](svelte[^'"]*)['"]/g,
        (match, source) => `from "https://esm.sh/${source}"`
      );
      jsCode = jsCode.replace(
        /import\s+['"](svelte[^'"]*)['"]/g,
        (match, source) => `import "https://esm.sh/${source}"`
      );

      // 3. Wrap in a Blob URL and import natively
      const blob = new Blob([jsCode], { type: "application/javascript" });
      const moduleUrl = URL.createObjectURL(blob);

      const mod = await import(moduleUrl);
      const Component = mod.default;
      URL.revokeObjectURL(moduleUrl);

      if (!Component) {
        throw new Error("Svelte component failed to compile or export a default component.");
      }

      // 4. Clean up and mount
      if (TARGET.__svelteInstance) {
        unmount(TARGET.__svelteInstance);
        TARGET.__svelteInstance = null;
      }

      TARGET.innerHTML = "";
      const container = document.createElement("div");
      TARGET.appendChild(container);

      TARGET.__svelteInstance = mount(Component, {
        target: container,
      });

      return TARGET.__svelteInstance;
    } catch (err) {
      TARGET.innerHTML = `<pre style="color: red; white-space: pre-wrap;">Svelte Error: ${err.message}</pre>`;
      console.error(err);
    }
  },

  // resolveImport(source) {
  //   const imports = {
  //     svelte: "https://esm.sh/svelte",
  //     "svelte/internal": "https://esm.sh/svelte/internal",
  //     "svelte/internal/client": "https://esm.sh/svelte/internal/client",
  //     "svelte/internal/disclose-version": "https://esm.sh/svelte/internal/disclose-version",
  //     "svelte/motion": "https://esm.sh/svelte/motion",
  //     "svelte/store": "https://esm.sh/svelte/store",
  //     "svelte/transition": "https://esm.sh/svelte/transition",
  //   };
  //   return imports[source] || (source.startsWith("http") ? source : `https://esm.sh/${source}`);
  // },
});