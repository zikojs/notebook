import van from "vanjs-core";
import { VanJSNotebookApp } from "@zikojs/notebook";

// Shared execution scope for eval'd cell code
window.__notebook_scope = Object.create(null);

const myImportMap = {
  "canvas-confetti": "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm"
};

const initialCellData = [
  {
    id: 1,
    type: "markdown",
    code: "# Interactive Playground Shortcuts\n- `Shift + Enter`: Run and advance/create cell\n- `Ctrl + Enter`: Run standalone without making a cell\n- `Ctrl + Shift + D`: Delete selection\n- `Ctrl + Shift + M`: Insert a new Markdown block below\n- `Ctrl + Shift + Y`: Insert a new Code block below",
    readonly: false,
    isEditingMarkdown: false
  },
  {
    id: 2,
    type: "code",
    readonly: false,
    code: `import confetti from "canvas-confetti";
const btn = van.tags.button({ class: "btn btn-primary", onclick: () => confetti() }, "Launch Confetti");
van.add(TARGET, btn);` 
  }
];

const notebookApp = new VanJSNotebookApp({
  cells: initialCellData,
  importMap: myImportMap,
  runCells: true,
  codeMirrorConfig: [], // pass extra CodeMirror 6 extensions here if needed
  markedPlugins: [],
  codeMirrorPlugins: [],
  minLines: 4,
  maxCells: 10
});

van.add(document.getElementById("app"), notebookApp.element);