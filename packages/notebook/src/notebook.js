import { NotebookStore } from "./store.js";
import { 
  Header, 
  CellItem, 
  MarkdownView,
  ErrorOutput
} from "./components/index.js";
import { evaluateCodeAsync } from "./compiler/index.js";
import { tags, UIElement } from "ziko/dom";
import { call_with_optional_props } from 'ziko/dom/internal-utils'
import { useState, useDerived } from "ziko/hooks";
const { div } = tags
// const [st, setSt] = useState('hh')
// globalThis.mm = useDerived((n)=>n, [st])
// globalThis.pp = tags.p({}, mm).mount(document.body)
// globalThis.st = st
// globalThis.setSt = setSt

export class UINotebook extends UIElement{
  constructor({
    cells: initialCells = [],
    importMap = {},
    runCells = true,
    minLines = 3,
    maxCells = Infinity,
    showHeader = true,
    codeMirrorConfig = {},
    codeMirrorPlugins = [],
    runtimePlugins = [],
    remarkPlugins = [],
    rehypePlugins = []

  } = {}) {
    super({ element : 'div'})
    this.setAttr({class : 'ziko-notebook'})
    this.id = crypto.randomUUID ? crypto.randomUUID() : 'nb_' + Math.random().toString(36).substring(2, 9);
    
    if (!window.__notebook_scope_map) {
      window.__notebook_scope_map = new Map();
    }
    this.resetScope();

    this.importMap = importMap;
    this.runtimePlugins = runtimePlugins;
    this.codeMirrorConfig = codeMirrorConfig;
    this.codeMirrorPlugins = codeMirrorPlugins;
    this.remarkPlugins = remarkPlugins;
    this.rehypePlugins = rehypePlugins;
    this.minLines = minLines;
    this.maxCells = maxCells;

    const startingCells = maxCells !== Infinity ? initialCells.slice(0, maxCells) : initialCells;
    let nextCellId = startingCells.length ? Math.max(...startingCells.map(c => c.id || 0)) + 1 : 1;

    this.store = new NotebookStore({
      cells: startingCells.map(cell => ({
        id: cell.id || nextCellId++,
        type: cell.type || "code",
        code: cell.code || "",
        readonly: cell.readonly ?? false,
        runtime: cell.runtime || null,
        isEditingMarkdown: cell.readonly ? false : (cell.isEditingMarkdown ?? true),
        execCount: cell.execCount ?? null,
        outputNode: cell.outputNode || null,
        hasDomOutput: cell.hasDomOutput ?? false,
        _copiedFlag: false,
        _dom: null, _editor: null, _actions: null,
        _inPrompt: null, _outPrompt: null, _bodySlot: null, _outputGrid: null, _outputRef: null
      })),
      activeCellId: startingCells.length ? startingCells[0].id : null,
      executionCounter: 1,
      executionQueueState: { isRunning: false, currentIndex: 0, total: 0 },
      maxCells: this.maxCells
    });

    this.nextCellId = nextCellId;

    this.notebookGlobalShortcuts = {
      deleteActive: () => this.deleteCell(this.store.get('activeCellId')),
      addMdBelow: () => this.addCell("markdown", "", this.store.get('activeCellId')),
      addCodeBelow: () => this.addCell("code", "", this.store.get('activeCellId'))
    };

    this.cellsContainer = div({ class: "cells-container" }).element;
    this.header = Header({
      store: this.store,
      actions: {
        runAll: () => this.runAllCells(),
        clearOutputs: () => this.clearOutputs(),
        addCode: () => this.addCell("code", "", this.store.get('activeCellId')),
        addMarkdown: () => this.addCell("markdown", "", this.store.get('activeCellId')),
        deleteActive: () => this.deleteCell(this.store.get('activeCellId')),
        exportData: () => console.log("Notebook Data Export:", this.getNotebookData())
      }
    });

    if(!showHeader) this.header.style.display = 'none'

    this.append(
      this.header, 
      div({ class: "notebook" }, 
      this.cellsContainer)  
    )

    this._renderAllCells();

    this.store.on('change:activeCellId', (newId, oldId) => {
      if (oldId !== null) {
        const prev = this.store.get('cells').find(c => c.id === oldId);
        if (prev) this._refreshCell(prev);
      }
      const next = this.store.get('cells').find(c => c.id === newId);
      if (next) this._refreshCell(next);
    });

    if (runCells) {
      setTimeout(() => { this.runAllCells(); }, 200);
    }
  }

  _isMaxCellsReached() { return this.store.get('cells').length >= this.maxCells; }

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
          const scope = app.getScope();
          await evaluateCodeAsync(
            code,
            cellData._outputRef,
            {
              importMap: app.importMap,
              plugins: app.runtimePlugins,
              runtime: cellData.runtime // <-- Passed dynamically from the cell configuration
            },
            scope,
          );
        } catch (err) {
          hasError = true;
          ErrorOutput(err).mount(cellData._outputRef);
        }

        const counter = this.store.get('executionCounter');
        this.store.set('executionCounter', counter + 1);
        cellData.execCount = counter;
        cellData.hasDomOutput = cellData._outputRef.childNodes.length > 0 || hasError;

        const container = div({ class: "output-area" }).element;
        while (cellData._outputRef.firstChild) container.appendChild(cellData._outputRef.firstChild);
        cellData.outputNode = container;
        cellData._outputRef.appendChild(container);

        if (autoNext && !hasError) app.nextCell(cellData.id, "code");
        app._refreshCell(cellData);
      },
      copyCode: async () => {
        const textToCopy = cellData._editor.getValue() || cellData.code;
        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch (err) {
          const temporary = tags.textarea(textToCopy).mount(document.body)
          temporary.element.select()
          document.execCommand("copy");
          temporary.unmount()
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
    return CellItem({ cellData, app: this, store: this.store });
  }

  _refreshCell(cellData) {
    const activeId = this.store.get('activeCellId');
    const isActive = activeId === cellData.id;
    cellData._dom.className = `cell ${isActive ? "active" : ""} ${cellData.readonly ? "readonly" : ""}`.trim();

    const countText = cellData.execCount ? `[${cellData.execCount}]` : "[ ]";
    const isMarkdownView = cellData.type === "markdown" && !cellData.isEditingMarkdown;

    cellData._inPrompt.textContent = cellData.type === "code" ? `In ${countText}:` : "";

    cellData._editor.sync(isActive, isMarkdownView);
    cellData._bodySlot.replaceChildren(
      isMarkdownView ? MarkdownView({ 
        cellData, 
        actions: cellData._actions,
        remarkPlugins : this.remarkPlugins,
        rehypePlugins : this.rehypePlugins
      }) : cellData._editor.dom
    );

    const showOutput = cellData.type === "code" && cellData.hasDomOutput;
    cellData._outputGrid.style.display = showOutput ? "grid" : "none";
    cellData._outPrompt.textContent = `Out ${countText}:`;
  }

  _renderAllCells() {
    const cells = this.store.get('cells');
    this.cellsContainer.replaceChildren(...cells.map(c => c._dom || this._buildCellDom(c)));
  }

  setActiveCell(id) {
    const currentActiveId = this.store.get('activeCellId');
    if (currentActiveId === id) return;

    // Check all cells and close editing mode for any markdown cells that are losing focus
    this.store.get('cells').forEach(c => {
      if (c.type === "markdown" && c.isEditingMarkdown) {
        c.isEditingMarkdown = false;
        this._refreshCell(c);
      }
    });

    this.store.set('activeCellId', id);
  }

  focusCell(targetId) {
    // Close editing on other markdown cells before focusing
    this.store.get('cells').forEach(c => {
      if (c.type === "markdown" && c.isEditingMarkdown && c.id !== targetId) {
        c.isEditingMarkdown = false;
        this._refreshCell(c);
      }
    });

    const target = this.store.get('cells').find(c => c.id === targetId);
    if (target && target.type === "markdown" && !target.readonly) {
      target.isEditingMarkdown = true;
    }
    this.store.set('activeCellId', targetId);
  }

  addCell(type = "code", initialCode = null, afterId = null, readonly = false) {
    const cells = [...this.store.get('cells')];
    if (cells.length >= this.maxCells) {
      console.warn(`Cannot create cell: Maximum cell limit (${this.maxCells}) reached.`);
      return null;
    }

    const newId = this.nextCellId++;
    const defaultText = type === "markdown" ? "### New Markdown Cell\nClick to edit..." : "";
    const newCell = {
      id: newId, type, code: initialCode !== null ? initialCode : defaultText, readonly,
      isEditingMarkdown: !readonly && type === "markdown" && initialCode === null,
      runtime: null,
      execCount: null, outputNode: null, hasDomOutput: false, _copiedFlag: false,
      _dom: null, _editor: null, _actions: null,
      _inPrompt: null, _outPrompt: null, _bodySlot: null, _outputGrid: null, _outputRef: null
    };

    if (afterId === null) {
      cells.push(newCell);
    } else {
      const index = cells.findIndex(c => c.id === afterId);
      cells.splice(index + 1, 0, newCell);
    }

    this.store.set('cells', cells);
    this._renderAllCells();
    this.focusCell(newId);
    return newId;
  }

  deleteCell(id) {
    const cells = this.store.get('cells');
    if (cells.length <= 1) return;
    const index = cells.findIndex(c => c.id === id);
    const updatedCells = cells.filter(c => c.id !== id);
    
    this.store.set('cells', updatedCells);
    this._renderAllCells();
    const nextActiveIndex = Math.min(index, updatedCells.length - 1);
    this.focusCell(updatedCells[nextActiveIndex].id);
  }

  nextCell(currentId, defaultType) {
    const cells = this.store.get('cells');
    const idx = cells.findIndex(c => c.id === currentId);
    if (idx === cells.length - 1) this.addCell(defaultType, null, currentId);
    else this.focusCell(cells[idx + 1].id);
  }

  async runCell(id) {
    const cell = this.store.get('cells').find(c => c.id === id);
    if (cell && cell._actions) await cell._actions.runCode(false);
  }

  async runAllCells() {
    const cells = this.store.get('cells');
    const codeCells = cells.filter(c => c.type === "code");
    if (codeCells.length === 0) return;

    this.store.set('executionQueueState', { isRunning: true, currentIndex: 0, total: codeCells.length });

    for (const cell of cells) {
      if (cell.type === "code" && cell._actions) {
        this.store.set('executionQueueState', { 
          isRunning: true, 
          currentIndex: codeCells.indexOf(cell), 
          total: codeCells.length 
        });
        await cell._actions.runCode(false);
      }
    }

    this.store.set('executionQueueState', { isRunning: false, currentIndex: 0, total: 0 });
  }

  clearOutputs() {
    this.store.get('cells').forEach(cell => {
      cell.execCount = null;
      cell.outputNode = null;
      cell.hasDomOutput = false;
      if (cell._outputRef) cell._outputRef.innerHTML = "";
    });
    this.store.set('executionCounter', 1);
    this.store.get('cells').forEach(c => this._refreshCell(c));
  }

  resetScope() {
    if (!window.__notebook_scope_map) {
      window.__notebook_scope_map = new Map();
    }
    const newScope = Object.create(null);
    window.__notebook_scope_map.set(this.id, newScope);
    return newScope;
  }

  getScope() {
    if (!window.__notebook_scope_map || !window.__notebook_scope_map.has(this.id)) {
      return this.resetScope();
    }
    return window.__notebook_scope_map.get(this.id);
  }

  getNotebookData({ inputs = true, outputs = true } = {}) {
    return this.store.get('cells').map(cell => {
      const exportedCell = { id: cell.id, type: cell.type, readonly: cell.readonly, order: cell.execCount };
      if (inputs) exportedCell.code = cell.code;
      if (outputs) exportedCell.outputHtml = cell.outputNode ? cell.outputNode.innerHTML : null;
      return exportedCell;
    });
  }
}

export const Notebook = call_with_optional_props(UINotebook)