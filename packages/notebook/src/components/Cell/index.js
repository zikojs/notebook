import van from "vanjs-core";
import { marked } from "marked";
import { createIcons, icons } from "lucide";
import { CodeEditor } from "../CodeEditor/index.js";

import Pencil from '@zikojs/lucide/Pencil'
import Play from '@zikojs/lucide/Play'
import Plus from '@zikojs/lucide/Plus'

const { div, button, span, i } = van.tags;

import { tags } from 'ziko/dom'

const Icon = ({ name }) => {
  const iconEl = i({ class: "icon" });
  setTimeout(() => createIcons({ attrs: { class: "lucide" }, nameAttr: 'data-lucide', icons: { [name]: icons[name] } }), 0);
  return iconEl;
};

const Button = ({ class: className = "", title = "", disabled = false, onclick, children = [] }) =>
  button({ class: `btn ${className}`, title, disabled, onclick }, ...children);

const CellPrompt = ({ type, countText }) =>
  span({ class: `prompt ${type === "out" ? "out" : ""}` },
    type === "in" ? `In ${countText}:` : type === "out" ? `Out ${countText}:` : "",
    tags.p('ziko')
);

const MarkdownView = ({ code, onClick }) => {
  const content = div();
  content.innerHTML = marked.parse(code || "*Empty Markdown Cell*");
  return div({ class: "markdown-rendered-cell markdown-body", onclick: onClick }, content);
};

const CellControls = ({ cellData, actions, isQueueRunning, isMaxCellsReached }) => {
  const isCopied = van.state(false);
  const handleCopy = async () => {
    await actions.copyCode();
    isCopied.val = true;
    setTimeout(() => { isCopied.val = false; }, 1500);
  };

  return () => div({ class: "cell-controls" },
    Button({ class: `btn-icon ${isCopied.val ? "btn-active" : ""}`, title: "Copy Cell", onclick: handleCopy, children: [Icon({ name: isCopied.val ? "Check" : "Copy" })] }),
    Button({ class: `btn-icon ${cellData.readonly ? "btn-active" : ""}`, title: "Toggle Readonly", disabled: isQueueRunning, onclick: actions.toggleReadonly, children: [Icon({ name: cellData.readonly ? "Lock" : "Unlock" })] }),
    Button({ class: `btn-icon ${cellData.type === "markdown" ? "btn-active" : ""}`, title: "Toggle Type", disabled: isQueueRunning || cellData.readonly, onclick: actions.toggleType, children: [Icon({ name: cellData.type === "code" ? "FileText" : "Code" })] }),
    cellData.type === "markdown" && !cellData.isEditingMarkdown
      ? Button({ class: "btn-icon", title: "Edit", disabled: isQueueRunning || cellData.readonly, onclick: actions.editMarkdown, children: [(Pencil({class : 'icon'})).element] })
      : Button({ class: "btn-icon btn-primary", title: "Run", disabled: isQueueRunning, onclick: () => actions.runCode(true), children: [Play({class : 'icon'}).element] }),
    Button({ class: "btn-icon", title: "Add Below", disabled: isQueueRunning || isMaxCellsReached, onclick: actions.addBelow, children: [Plus({class : 'icon'}).element] }),
    Button({ class: "btn-icon", title: "Delete", disabled: isQueueRunning, onclick: actions.deleteCell, children: [Icon({ name: "Trash2" })] })
  );
};

const CellOutput = ({ countText, outputRef }) =>
  div({ class: "cell-output-grid" }, CellPrompt({ type: "out", countText }), div({ class: "output-wrapper" }, outputRef));

export const NotebookCell = ({ cellData, activeCellId, actions, executionCounter, executionQueueState, codeMirrorConfig, importMap, notebookGlobalShortcuts, codeMirrorPlugins, minLines, isMaxCellsReached, evaluateCodeAsync }) => {
  const outputRef = div({ class: "output-area" });
  if (cellData.outputNode) outputRef.appendChild(cellData.outputNode);

  const cellActions = {
    setActive: () => actions.setActiveCell(cellData.id),
    runCode: async (autoNext = true) => {
      const code = editor.getValue();
      cellData.code = code;

      if (cellData.type === "markdown") {
        cellData.isEditingMarkdown = false;
        if (autoNext) actions.nextCell(cellData.id, "markdown");
        else actions.updateCells();
        return;
      }
      if (!code.trim()) return;

      outputRef.innerHTML = "";
      let hasError = false;
      try {
        await evaluateCodeAsync(code, outputRef, importMap);
      } catch (err) {
        hasError = true;
        van.add(outputRef, div({ class: "error-output" }, err.toString()));
      }

      cellData.execCount = executionCounter.val++;
      cellData.hasDomOutput = outputRef.childNodes.length > 0 || hasError;

      const container = div({ class: "output-area" });
      while (outputRef.firstChild) container.appendChild(outputRef.firstChild);
      cellData.outputNode = container;
      outputRef.appendChild(container);

      if (autoNext && !hasError) actions.nextCell(cellData.id, "code");
      else actions.updateCells();
    },
    copyCode: async () => {
      await navigator.clipboard.writeText(editor.getValue() || cellData.code);
    },
    toggleReadonly: () => {
      cellData.readonly = !cellData.readonly;
      if (cellData.readonly) cellData.isEditingMarkdown = false;
      actions.updateCells();
    },
    toggleType: () => {
      if (cellData.readonly) return;
      cellData.type = cellData.type === "code" ? "markdown" : "code";
      cellData.isEditingMarkdown = true;
      cellData.hasDomOutput = false;
      actions.updateCells();
    },
    editMarkdown: () => {
      if (cellData.readonly) return;
      cellData.isEditingMarkdown = true;
      actions.updateCells();
    },
    addBelow: () => actions.createCell(cellData.id, cellData.type),
    deleteCell: () => actions.deleteCell(cellData.id)
  };

  const editor = CodeEditor({ cellData, actions: cellActions, notebookGlobalShortcuts, userCodeMirrorConfig: codeMirrorConfig, codeMirrorPlugins, minLines });
  cellData._runActionRef = cellActions.runCode;

  return () => {
    const isActive = activeCellId.val === cellData.id;
    const isMarkdownView = cellData.type === "markdown" && !cellData.isEditingMarkdown;
    editor.sync(isActive, isMarkdownView);
    const countText = cellData.execCount ? `[${cellData.execCount}]` : "[ ]";

    return div(
      { class: () => `cell ${activeCellId.val === cellData.id ? "active" : ""} ${cellData.readonly ? "readonly" : ""}`, onclick: cellActions.setActive },
      div({ class: "cell-input-grid" },
        cellData.type === "code" ? CellPrompt({ type: "in", countText }) : span({ class: "prompt" }),
        isMarkdownView ? MarkdownView({ code: cellData.code, onClick: cellActions.editMarkdown }) : editor.dom,
        CellControls({ cellData, actions: cellActions, isQueueRunning: executionQueueState.val.isRunning, isMaxCellsReached })
      ),
      cellData.type === "code" && cellData.hasDomOutput ? CellOutput({ countText, outputRef }) : null
    );
  };
};