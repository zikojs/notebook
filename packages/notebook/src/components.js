import van from "vanjs-core";
import { marked } from "marked";
import { Button } from "./ui.js";
import { createCodeEditor } from "./codeEditor.js";
import { evaluateCodeAsync } from "./transform.js";

import {
  Check,
  Copy,
  Lock,
  Unlock,
  Code2,
  FileText,
  Pencil,
  Play,
  Plus,
  Trash2,
  PlayForward,
  Eraser,
  Download,
  Loader2
} from './icons.js';

const { div, span } = van.tags;

export function Header({ store, actions }) {
  const statusBadge = span({ class: "status-badge", style: "display:none;" }, Loader2(), span());
  const runAllBtn = Button({ class: "btn-primary", onclick: actions.runAll }, PlayForward(), "Run All");
  const clearBtn = Button({ onclick: actions.clearOutputs }, Eraser(), "Clear Outputs");
  const addCodeBtn = Button({ onclick: actions.addCode }, Play(), "Add Code");
  const addMdBtn = Button({ onclick: actions.addMarkdown }, FileText(), "Add Markdown");
  const deleteActiveBtn = Button({ onclick: actions.deleteActive }, Trash2(), "Delete Active");
  const exportBtn = Button({ onclick: actions.exportData }, Download(), "Export Data");

  store.on('change:executionQueueState', (q) => {
    statusBadge.style.display = q.isRunning ? "inline-flex" : "none";
    statusBadge.lastChild.textContent = `Executing Queue (${q.currentIndex + 1}/${q.total})`;
    [runAllBtn, clearBtn, deleteActiveBtn].forEach(b => { b.disabled = q.isRunning; });
    const maxReached = store.get('cells').length >= store.get('maxCells');
    addCodeBtn.disabled = q.isRunning || maxReached;
    addMdBtn.disabled = q.isRunning || maxReached;
  });

  return div({ class: "header" },
    div({ class: "brand" }, "</>", statusBadge),
    div({ class: "toolbar" }, 
      runAllBtn, clearBtn, addCodeBtn, addMdBtn, deleteActiveBtn, exportBtn
    )
  );
}

export function MarkdownView({ cellData, actions }) {
  const content = div();
  content.innerHTML = marked.parse(cellData.code || "*Empty Markdown Cell*");
  
  const wrap = div({ class: "markdown-rendered-cell markdown-body" }, content);
  wrap.onclick = () => actions.editMarkdown();
  return wrap;
}

export function CellControls({ cellData, store, actions }) {
  const controlsContainer = div({ class: "cell-controls" });

  const renderButtons = () => {
    const isQueueRunning = store.get('executionQueueState').isRunning;
    const isMaxCellsReached = store.get('cells').length >= store.get('maxCells');
    const isCopied = cellData._copiedFlag === true;

    controlsContainer.replaceChildren(
      Button({ 
        class: `btn-icon ${isCopied ? "btn-active" : ""}`, 
        title: isCopied ? "Copied!" : "Copy Cell Content", 
        onclick: async () => {
          await actions.copyCode();
          cellData._copiedFlag = true;
          renderButtons();
          setTimeout(() => { 
            cellData._copiedFlag = false; 
            renderButtons(); 
          }, 1500);
        }
      }, isCopied ? Check() : Copy()),

      Button({ 
        class: `btn-icon ${cellData.readonly ? "btn-active" : ""}`, 
        title: cellData.readonly ? "Make Editable" : "Make Read-Only", 
        disabled: isQueueRunning, 
        onclick: actions.toggleReadonly, 
      }, cellData.readonly ? Lock() : Unlock()),

      Button({ 
        class: `btn-icon ${cellData.type === "markdown" ? "btn-active" : ""}`, 
        title: `Switch to ${cellData.type === "code" ? "Markdown" : "JS Code"}`, 
        disabled: isQueueRunning || cellData.readonly, 
        onclick: actions.toggleType, 
      }, cellData.type === "code" ? FileText() : Code2()),

      (cellData.type === "markdown" && !cellData.isEditingMarkdown)
        ? Button({ 
            class: "btn-icon", 
            title: "Edit Markdown", 
            disabled: isQueueRunning || cellData.readonly, 
            onclick: actions.editMarkdown 
          }, Pencil())
        : Button({ 
            class: "btn-icon btn-primary", 
            title: "Run & Advance (Shift+Enter)", 
            disabled: isQueueRunning, 
            onclick: () => actions.runCode(true) 
          }, Play()),

      Button({ 
        class: "btn-icon", 
        title: "Add Cell Below", 
        disabled: isQueueRunning || isMaxCellsReached, 
        onclick: actions.addBelow 
      }, Plus()),

      Button({ 
        class: "btn-icon", 
        title: "Delete Cell", 
        disabled: isQueueRunning, 
        onclick: actions.deleteCell 
      }, Trash2())
    );
  };

  renderButtons();
  store.on('change', renderButtons);

  return controlsContainer;
}

export function CellItem({ cellData, app, store }) {
  const outputRef = div({ class: "output-area" });
  if (cellData.outputNode) outputRef.appendChild(cellData.outputNode);
  cellData._outputRef = outputRef;

  const actions = app._cellActions(cellData);
  cellData._actions = actions;
  cellData._editor = createCodeEditor(app, cellData, actions);

  const inPrompt = span({ class: "prompt" });
  const outPrompt = span({ class: "prompt out" });
  const bodySlot = div({ style: "display:contents;" });
  const controlsEl = CellControls({ cellData, store, actions });

  const outputGrid = div({ class: "cell-output-grid" }, outPrompt, div({ class: "output-wrapper" }, outputRef));
  const inputGrid = div({ class: "cell-input-grid" }, inPrompt, bodySlot, controlsEl);
  const root = div({ class: "cell" }, inputGrid, outputGrid);
  root.onclick = () => app.setActiveCell(cellData.id);

  cellData._dom = root;
  cellData._inPrompt = inPrompt;
  cellData._outPrompt = outPrompt;
  cellData._bodySlot = bodySlot;
  cellData._outputGrid = outputGrid;

  app._refreshCell(cellData);
  return root;
}