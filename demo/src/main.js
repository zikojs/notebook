import { NotebookApp } from "@zikojs/notebook";
import van from "vanjs-core";

// const myImportMap = { "canvas-confetti": "canvas-confetti" };
const myImportMap = { 
  "canvas-confetti": "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm" 

};
const initialCellData = [
  { 
    id: 1, 
    type: "markdown",
    code: "# Vite Jupyter VanJS Notebook\n- Modularized with npm packages and ES modules.",
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

const notebookApp = new NotebookApp({
  cells: initialCellData,
  importMap: myImportMap,
  runCells: true,
  minLines: 4,
  maxCells: 10
});

van.add(document.getElementById("app"), notebookApp.element);

globalThis.a = notebookApp