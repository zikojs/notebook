import { UINotebook  } from "@zikojs/notebook";
import { reactPlugin } from '@zikojs/notebook-runtime-react'
import { sveltePlugin } from '@zikojs/notebook-runtime-svelte'

import rehypeMindElixir from 'rehype-mind-elixir'
import rehypeMermaid from 'rehype-mermaid'

// Shared execution scope for eval'd cell code
// window.__notebook_scope = Object.create(null);

const myImportMap = {
  "canvas-confetti": "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm"
};

const gist_raw = 'https://gist.githubusercontent.com/zakarialaoui10/a0537d3e4787d1070d57400f93a259bf/raw/9aa68e5f1f6c4e4223326f22054c6579285ac66c/hello'
const initialCellData = [
  {
    id: 1,
    type: "markdown",
    code: "# Interactive Playground Shortcuts\n- `Shift + Enter`: Run and advance/create cell\n- `Ctrl + Enter`: Run standalone without making a cell\n- `Ctrl + Shift + D`: Delete selection\n- `Ctrl + Shift + M`: Insert a new Markdown block below\n- `Ctrl + Shift + Y`: Insert a new Code block below",
    readonly: false,
    isEditingMarkdown: false
  },
  {
    code : fetch(gist_raw).then(e=>e.text())
  },
  {
    code : `import { tags } from 'ziko/dom'
tags.p('hello world')`
  },
  {
    runtime : 'svelte',
    code : `<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Svelte Counter: {count}
</button>

<style>
  button {
    padding: 8px 12px;
    background: #ff3e00;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>`
  },
//   {
//     id: 2,
//     type: "code",
//     readonly: false,
//     code: `import van from 'vanjs-core'
// import confetti from "canvas-confetti";
// const btn = van.tags.button({ class: "btn btn-primary", onclick: () => confetti() }, "Launch Confetti");
// van.add(TARGET, btn);` 
//   },
  {
    runtime : 'react',
    code : `import { createRoot } from "react-dom/client";
import { useState } from "react"
import confetti from "canvas-confetti";

const App = () => {
  const [count, setCount] = useState(0);
  const handleClick = () => {
    setCount(count + 1)
    confetti()
  }
  return <button 
    className="btn btn-primary" 
    onClick={handleClick}>
    Launch Confetti {count} 
  </button>
}

const container = document.createElement("div");
TARGET.appendChild(container);
createRoot(container).render(<App />);
    `

  }
];

const notebookApp = new UINotebook({
  cells: initialCellData,
  importMap: myImportMap,
  runCells: true,
  codeMirrorConfig: [], // pass extra CodeMirror 6 extensions here if needed
  markedPlugins: [],
  codeMirrorPlugins: [],
  minLines: 4,
  maxCells: 10,
  runtimePlugins : [
    reactPlugin(),
    sveltePlugin(),
  ],
  rehypePlugins : [rehypeMermaid, rehypeMindElixir]
  
});

// van.add(document.getElementById("app"), notebookApp.element);

globalThis.notebookApp = notebookApp
document.body.append(notebookApp.element)
