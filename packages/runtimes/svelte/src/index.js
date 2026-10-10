import { compile } from "svelte/compiler";
import { 
  mount, 
  unmount
} from "https://esm.sh/svelte";

import { svelte } from "codemirror-lang-svelte";
// import { oneDark } from "@codemirror/theme-one-dark";


import { tags } from 'ziko/dom'


export const SvelteIdentifier = 'svelte'
export const sveltePlugin = ({
  runes = true,
} = {}) => ({
  name: SvelteIdentifier,
  language: svelte(),

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

      const mod = await import(/* @vite-ignore */moduleUrl);
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
      const container = tags.div().element;
      TARGET.appendChild(container);

      TARGET.__svelteInstance = mount(Component, {
        target: container,
      });

      return TARGET.__svelteInstance;
    } catch (err) {
      tags.pre(`Svelte Error: ${err.message}`).style({
        color : 'red',
        whiteSpace : 'pre-wrap'
      }).mount(TARGET)
      console.error(err);
    }
  },

});