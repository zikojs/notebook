import { createCodeEditor } from "../../code-editor/index.js";
import { tags } from 'ziko/dom'
import { useState } from 'ziko/hooks'
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
} from '../icons/index.js';
const { div, span } = tags;

import { Button } from "../Button/index.js";

export const Prompt = () => {
  return span({ class: "prompt" })
}

export function CellItem({ cellData, app, store }) {
  const outputRef = div({ class: "output-area" });
  if (cellData.outputNode) outputRef.append(cellData.outputNode);
  cellData._outputRef = outputRef.element;

  const actions = app._cellActions(cellData);
  cellData._actions = actions;
  cellData._editor = createCodeEditor(app, cellData, actions);
  /* Check ziko */
  const [In, setIn] = useState(0)
  globalThis.setIn = setIn
  const inPrompt = span({ class: "prompt" }, In);
  const outPrompt = span({ class: "prompt out" });
  const bodySlot = div().style({ display : 'contents'});
  const controlsEl = CellControls({ cellData, store, actions });

  const outputGrid = div({ class: "cell-output-grid" }, outPrompt, div({ class: "output-wrapper" }, outputRef));
  const inputGrid = div({ class: "cell-input-grid" }, inPrompt, bodySlot, controlsEl);
  const root = div({ class: "cell" }, inputGrid, outputGrid);
  root.onClick(() => app.setActiveCell(cellData.id));

  cellData._dom = root.element;
  cellData._inPrompt = inPrompt.element;
  cellData._outPrompt = outPrompt.element;
  cellData._bodySlot = bodySlot.element;
  cellData._outputGrid = outputGrid.element;
  cellData._setIn = setIn

  app._refreshCell(cellData);
  return root.element;
}

export function CellControls({ cellData, store, actions }) {
  const controlsContainer = div({ class: "cell-controls" }).element;

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
