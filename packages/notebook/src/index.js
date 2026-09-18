import './index.css'
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
} from './icons.js'

const { div, span } = van.tags;

export function Header({ state, actions }) {
  const { runAllBtn, clearBtn, addCodeBtn, addMdBtn, deleteActiveBtn, exportBtn, statusBadge, statusText } = state;

  return div({ class: "header" },
    div({ class: "brand" }, "Jupyter VanJS Notebook", statusBadge),
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

export function CellControls({ cellData, state, actions }) {
  const isQueueRunning = state.executionQueueState_state.isRunning;
  const isMaxCellsReached = state.cells_state.length >= state.maxCells;
  const isCopied = cellData._copiedFlag_state === true;

  const handleCopy = async () => {
    await actions.copyCode();
    cellData._copiedFlag_state = true;
    state.refreshControls(cellData);
    setTimeout(() => { 
      cellData._copiedFlag_state = false; 
      state.refreshControls(cellData); 
    }, 1500);
  };

  return [
    Button({ 
      class: `btn-icon ${isCopied ? "btn-active" : ""}`, 
      title: isCopied ? "Copied!" : "Copy Cell Content", 
      onclick: handleCopy
    },
    isCopied ? Check() : Copy()
  ),
    Button({ 
      class: `btn-icon ${cellData.readonly ? "btn-active" : ""}`, 
      title: cellData.readonly ? "Make Editable" : "Make Read-Only", 
      disabled: isQueueRunning, 
      onclick: actions.toggleReadonly, 
      },
      cellData.readonly ? Lock() : Unlock()
    ),
    Button({ 
      class: `btn-icon ${cellData.type === "markdown" ? "btn-active" : ""}`, 
      title: `Switch to ${cellData.type === "code" ? "Markdown" : "JS Code"}`, 
      disabled: isQueueRunning || cellData.readonly, 
      onclick: actions.toggleType, 
      },
      cellData.type === "code" ? FileText() : Code2()
    ),
    (cellData.type === "markdown" && !cellData.isEditingMarkdown)
      ? Button(
        { 
          class: "btn-icon", 
          title: "Edit Markdown", 
          disabled: isQueueRunning || cellData.readonly, 
          onclick: actions.editMarkdown
        },
          Pencil()
        )
      : Button({ 
          class: "btn-icon btn-primary", 
          title: "Run & Advance (Shift+Enter)", 
          disabled: isQueueRunning, 
          onclick: () => actions.runCode(true)
        },
          Play()
        ),
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
  ];
}

export function CellItem({ cellData, app }) {
  const outputRef = div({ class: "output-area" });
  if (cellData.outputNode) outputRef.appendChild(cellData.outputNode);
  cellData._outputRef = outputRef;

  const actions = app._cellActions(cellData);
  cellData._actions = actions;
  cellData._editor = createCodeEditor(app, cellData, actions);

  const inPrompt = span({ class: "prompt" });
  const outPrompt = span({ class: "prompt out" });
  const bodySlot = div({ style: "display:contents;" });
  const controlsEl = div({ class: "cell-controls" });

  const outputGrid = div({ class: "cell-output-grid" }, outPrompt, div({ class: "output-wrapper" }, outputRef));
  const inputGrid = div({ class: "cell-input-grid" }, inPrompt, bodySlot, controlsEl);
  const root = div({ class: "cell" }, inputGrid, outputGrid);
  root.onclick = () => app.setActiveCell(cellData.id);

  cellData._dom = root;
  cellData._inPrompt = inPrompt;
  cellData._outPrompt = outPrompt;
  cellData._bodySlot = bodySlot;
  cellData._controlsEl = controlsEl;
  cellData._outputGrid = outputGrid;

  app._refreshCell(cellData);
  return root;
}

// --- MAIN NOTEBOOK APP CLASS ---

export class NotebookApp {
  constructor({
    cells: initialCells = [],
    importMap = {},
    runCells = true,
    codeMirrorConfig = {},
    markedPlugins = [],
    codeMirrorPlugins = [],
    minLines = 3,
    maxCells = Infinity
  } = {}) {
    this.importMap = importMap;
    this.codeMirrorConfig = codeMirrorConfig;
    this.codeMirrorPlugins = codeMirrorPlugins;
    this.minLines = minLines;
    this.maxCells = maxCells;

    if (Array.isArray(markedPlugins) && markedPlugins.length > 0) {
      markedPlugins.forEach(plugin => marked.use(plugin));
    }

    const startingCells = maxCells !== Infinity ? initialCells.slice(0, maxCells) : initialCells;

    this.nextCellId_state = startingCells.length ? Math.max(...startingCells.map(c => c.id || 0)) + 1 : 1;

    this.cells_state = startingCells.map(cell => ({
      id: cell.id || this.nextCellId_state++,
      type: cell.type || "code",
      code: cell.code || "",
      readonly: cell.readonly ?? false,
      isEditingMarkdown: cell.readonly ? false : (cell.isEditingMarkdown ?? true),
      execCount: cell.execCount ?? null,
      outputNode: cell.outputNode || null,
      hasDomOutput: cell.hasDomOutput ?? false,
      _copiedFlag_state: false,
      _dom: null, _editor: null, _actions: null,
      _inPrompt: null, _outPrompt: null, _bodySlot: null, _controlsEl: null, _outputGrid: null, _outputRef: null
    }));

    this.activeCellId_state = this.cells_state.length ? this.cells_state[0].id : null;
    this.executionCounter_state = 1;
    this.executionQueueState_state = { isRunning: false, currentIndex: 0, total: 0 };

    this.notebookGlobalShortcuts = {
      deleteActive: () => this.deleteCell(this.activeCellId_state),
      addMdBelow: () => this.addCell("markdown", "", this.activeCellId_state),
      addCodeBelow: () => this.addCell("code", "", this.activeCellId_state)
    };

    this.cellsContainer = div({ class: "cells-container" });
    this.header = this._buildHeader();
    this.element = div(this.header, div({ class: "notebook" }, this.cellsContainer));

    this._renderAllCells();

    if (runCells) {
      setTimeout(() => { this.runAllCells(); }, 200);
    }
  }

  _isMaxCellsReached() { return this.cells_state.length >= this.maxCells; }

  // --- HEADER BUILDER ---

  _buildHeader() {
    this.runAllBtn = Button({ 
      class: "btn-primary", 
      onclick: () => this.runAllCells(), 
      }, PlayForward(), "Run All"
    );
    this.clearBtn = Button({ 
      onclick: () => this.clearOutputs()
    }, Eraser(), "Clear Outputs");
    this.addCodeBtn = Button({ 
      onclick: () => this.addCell("code", "", this.activeCellId_state), 
    }, Play(), "Add Code");
    this.addMdBtn = Button({ 
      onclick: () => this.addCell("markdown", "", this.activeCellId_state), 
    }, FileText(), "Add Markdown");
    this.deleteActiveBtn = Button({ 
      onclick: () => this.deleteCell(this.activeCellId_state)
    }, Trash2(), "Delete Active");
    this.exportBtn = Button({ 
      onclick: () => console.log("Notebook Data Export:", this.getNotebookData())
    }, Download(), "Export Data");

    this.statusText = span();
    this.statusBadge = span({ 
      class: "status-badge", 
      style: "display:none;" 
    }, Loader2(), this.statusText);

    const header = Header({
      state: {
        runAllBtn: this.runAllBtn,
        clearBtn: this.clearBtn,
        addCodeBtn: this.addCodeBtn,
        addMdBtn: this.addMdBtn,
        deleteActiveBtn: this.deleteActiveBtn,
        exportBtn: this.exportBtn,
        statusBadge: this.statusBadge,
        statusText: this.statusText
      }
    });

    this._updateHeaderUI();
    return header;
  }

  _updateHeaderUI() {
    const q = this.executionQueueState_state;
    this.statusBadge.style.display = q.isRunning ? "inline-flex" : "none";
    this.statusText.textContent = `Executing Queue (${q.currentIndex + 1}/${q.total})`;
    [this.runAllBtn, this.clearBtn, this.deleteActiveBtn].forEach(b => { b.disabled = q.isRunning; });
    const maxReached = this._isMaxCellsReached();
    this.addCodeBtn.disabled = q.isRunning || maxReached;
    this.addMdBtn.disabled = q.isRunning || maxReached;
  }

  // --- CELL ACTIONS & DOM ---

  _cellActions(cellData) {
    const app = this;
    return {
      setActive: () => app.setActiveCell(cellData.id),
      runCode: async (autoNext = true) => {
        const code = cellData._editor.getValue();
        cellData.code = code;

        if (cellData.type === "markdown") {
          cellData.isEditingMarkdown = false;
          if (autoNext) app.nextCell(cellData.id, "markdown");
          else app._refreshCell(cellData);
          return;
        }

        if (!code.trim()) return;

        cellData._outputRef.innerHTML = "";
        let hasError = false;

        try {
          await evaluateCodeAsync(code, cellData._outputRef, app.importMap);
        } catch (err) {
          hasError = true;
          van.add(cellData._outputRef, div({ class: "error-output" }, err.toString()));
        }

        cellData.execCount = app.executionCounter_state++;
        cellData.hasDomOutput = cellData._outputRef.childNodes.length > 0 || hasError;

        const container = div({ class: "output-area" });
        while (cellData._outputRef.firstChild) container.appendChild(cellData._outputRef.firstChild);
        cellData.outputNode = container;
        cellData._outputRef.appendChild(container);

        if (autoNext && !hasError) app.nextCell(cellData.id, "code");
        else app._refreshCell(cellData);
      },
      copyCode: async () => {
        const textToCopy = cellData._editor.getValue() || cellData.code;
        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch (err) {
          const textArea = document.createElement("textarea");
          textArea.value = textToCopy;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
      },
      toggleReadonly: () => {
        cellData.readonly = !cellData.readonly;
        if (cellData.readonly && cellData.type === "markdown") cellData.isEditingMarkdown = false;
        app._refreshCell(cellData);
      },
      toggleType: () => {
        if (cellData.readonly) return;
        cellData.type = cellData.type === "code" ? "markdown" : "code";
        cellData.isEditingMarkdown = true;
        cellData.hasDomOutput = false;
        app._refreshCell(cellData);
      },
      editMarkdown: () => {
        if (cellData.readonly) return;
        cellData.isEditingMarkdown = true;
        app._refreshCell(cellData);
      },
      addBelow: () => app.addCell(cellData.type, null, cellData.id),
      deleteCell: () => app.deleteCell(cellData.id)
    };
  }

  _buildCellDom(cellData) {
    return CellItem({ cellData, app: this });
  }

  _refreshCell(cellData) {
    const isActive = this.activeCellId_state === cellData.id;
    cellData._dom.className = `cell ${isActive ? "active" : ""} ${cellData.readonly ? "readonly" : ""}`.trim();

    const countText = cellData.execCount ? `[${cellData.execCount}]` : "[ ]";
    const isMarkdownView = cellData.type === "markdown" && !cellData.isEditingMarkdown;

    cellData._inPrompt.textContent = cellData.type === "code" ? `In ${countText}:` : "";

    cellData._editor.sync(isActive, isMarkdownView);
    cellData._bodySlot.replaceChildren(
      isMarkdownView ? MarkdownView({ cellData, actions: cellData._actions }) : cellData._editor.dom
    );

    this._refreshCellControls(cellData);

    const showOutput = cellData.type === "code" && cellData.hasDomOutput;
    cellData._outputGrid.style.display = showOutput ? "grid" : "none";
    cellData._outPrompt.textContent = `Out ${countText}:`;
  }

  _refreshCellControls(cellData) {
    const buttons = CellControls({
      cellData,
      state: this,
      actions: cellData._actions
    });
    cellData._controlsEl.replaceChildren(...buttons);
  }

  // --- STATE MUTATORS ---

  _renderAllCells() {
    this.cellsContainer.replaceChildren(...this.cells_state.map(c => c._dom || this._buildCellDom(c)));
    this._updateHeaderUI();
  }

  setActiveCell(id) {
    if (this.activeCellId_state === id) return;
    const current = this.cells_state.find(c => c.id === this.activeCellId_state);
    if (current && current.type === "markdown" && current.isEditingMarkdown) current.isEditingMarkdown = false;
    this.activeCellId_state = id;
    if (current) this._refreshCell(current);
    const next = this.cells_state.find(c => c.id === id);
    if (next) this._refreshCell(next);
  }

  focusCell(targetId) {
    const prevId = this.activeCellId_state;
    this.activeCellId_state = targetId;
    const target = this.cells_state.find(c => c.id === targetId);
    if (target && target.type === "markdown" && !target.readonly) target.isEditingMarkdown = true;
    if (prevId !== targetId) {
      const prevCell = this.cells_state.find(c => c.id === prevId);
      if (prevCell) this._refreshCell(prevCell);
    }
    if (target) this._refreshCell(target);
  }

  addCell(type = "code", initialCode = null, afterId = null, readonly = false) {
    if (this.cells_state.length >= this.maxCells) {
      console.warn(`Cannot create cell: Maximum cell limit (${this.maxCells}) reached.`);
      return null;
    }

    const newId = this.nextCellId_state++;
    const defaultText = type === "markdown" ? "### New Markdown Cell\nClick to edit..." : "";
    const newCell = {
      id: newId, type, code: initialCode !== null ? initialCode : defaultText, readonly,
      isEditingMarkdown: !readonly && type === "markdown" && initialCode === null,
      execCount: null, outputNode: null, hasDomOutput: false, _copiedFlag_state: false,
      _dom: null, _editor: null, _actions: null,
      _inPrompt: null, _outPrompt: null, _bodySlot: null, _controlsEl: null, _outputGrid: null, _outputRef: null
    };

    if (afterId === null) {
      this.cells_state.push(newCell);
    } else {
      const index = this.cells_state.findIndex(c => c.id === afterId);
      this.cells_state.splice(index + 1, 0, newCell);
    }

    this._renderAllCells();
    this.focusCell(newId);
    return newId;
  }

  deleteCell(id) {
    if (this.cells_state.length <= 1) return;
    const index = this.cells_state.findIndex(c => c.id === id);
    this.cells_state = this.cells_state.filter(c => c.id !== id);
    this._renderAllCells();
    const nextActiveIndex = Math.min(index, this.cells_state.length - 1);
    this.focusCell(this.cells_state[nextActiveIndex].id);
  }

  nextCell(currentId, defaultType) {
    const idx = this.cells_state.findIndex(c => c.id === currentId);
    if (idx === this.cells_state.length - 1) this.addCell(defaultType, null, currentId);
    else this.focusCell(this.cells_state[idx + 1].id);
  }

  async runCell(id) {
    const cell = this.cells_state.find(c => c.id === id);
    if (cell && cell._actions) await cell._actions.runCode(false);
  }

  async runAllCells() {
    const codeCells = this.cells_state.filter(c => c.type === "code");
    if (codeCells.length === 0) return;

    this.executionQueueState_state = { isRunning: true, currentIndex: 0, total: codeCells.length };
    this._updateHeaderUI();
    this.cells_state.forEach(c => this._refreshCellControls(c));

    for (const cell of this.cells_state) {
      if (cell.type === "code" && cell._actions) {
        this.executionQueueState_state = { ...this.executionQueueState_state, currentIndex: codeCells.indexOf(cell) };
        this._updateHeaderUI();
        await cell._actions.runCode(false);
      }
    }

    this.executionQueueState_state = { isRunning: false, currentIndex: 0, total: 0 };
    this._updateHeaderUI();
    this.cells_state.forEach(c => this._refreshCellControls(c));
  }

  clearOutputs() {
    this.cells_state.forEach(cell => {
      cell.execCount = null;
      cell.outputNode = null;
      cell.hasDomOutput = false;
      if (cell._outputRef) cell._outputRef.innerHTML = "";
    });
    this.executionCounter_state = 1;
    this.cells_state.forEach(c => this._refreshCell(c));
  }

  resetScope() {
    window.__notebook_scope = Object.create(null);
  }

  getNotebookData({ inputs = true, outputs = true } = {}) {
    return this.cells_state.map(cell => {
      const exportedCell = { id: cell.id, type: cell.type, readonly: cell.readonly, order: cell.execCount };
      if (inputs) exportedCell.code = cell.code;
      if (outputs) exportedCell.outputHtml = cell.outputNode ? cell.outputNode.innerHTML : null;
      return exportedCell;
    });
  }
}