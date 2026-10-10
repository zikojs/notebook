
import { NotebookStore } from "./store.js";
import {
  Header,
  CellItem,
  MarkdownView,
  ErrorOutput,
} from "./components/index.js";
import { evaluateCodeAsync } from "./compiler/index.js";
import { tags, UIElement } from "ziko/dom";
import { call_with_optional_props } from "ziko/dom/internal-utils";

const { div } = tags;

const isPromiseLike = (value) =>
  value != null &&
  (typeof value === "object" || typeof value === "function") &&
  typeof value.then === "function";

const resolveCode = async (code) => {
  const resolved = await code;

  if (typeof resolved !== "string") {
    throw new TypeError(
      `Cell code must resolve to a string; received ${typeof resolved}.`
    );
  }

  return resolved;
};

export class UINotebook extends UIElement {
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
    rehypePlugins = [],
  } = {}) {
    super({ element: "div" });

    this.setAttr({ class: "ziko-notebook" });
      __Ziko__.__Config__.default.autoMount = true;


    this.id = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : "nb_" + Math.random().toString(36).substring(2, 9);

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

    this.nextCellId = 1;

    this.store = new NotebookStore({
      cells: [],
      activeCellId: null,
      executionCounter: 1,
      executionQueueState: {
        isRunning: false,
        currentIndex: 0,
        total: 0,
      },
      maxCells: this.maxCells,
    });

    this.notebookGlobalShortcuts = {
      deleteActive: () =>
        this.deleteCell(this.store.get("activeCellId")),
      addMdBelow: () =>
        this.addCell("markdown", "", this.store.get("activeCellId")),
      addCodeBelow: () =>
        this.addCell("code", "", this.store.get("activeCellId")),
    };

    this.cellsContainer = div({ class: "cells-container" }).element;

    this.header = Header({
      store: this.store,
      actions: {
        runAll: () => this.runAllCells(),
        clearOutputs: () => this.clearOutputs(),
        addCode: () =>
          this.addCell("code", "", this.store.get("activeCellId")),
        addMarkdown: () =>
          this.addCell("markdown", "", this.store.get("activeCellId")),
        deleteActive: () =>
          this.deleteCell(this.store.get("activeCellId")),
        exportData: () =>
          console.log("Notebook Data Export:", this.getNotebookData()),
      },
    });

    if (!showHeader) {
      this.header.style.display = "none";
    }

    this.append(
      this.header,
      div({ class: "notebook" }, this.cellsContainer)
    );

    this.store.on("change:activeCellId", (newId, oldId) => {
      if (oldId !== null) {
        const previous = this.store
          .get("cells")
          .find((cell) => cell.id === oldId);

        if (previous?._dom) {
          this._refreshCell(previous);
        }
      }

      const next = this.store
        .get("cells")
        .find((cell) => cell.id === newId);

      if (next?._dom) {
        this._refreshCell(next);
      }
    });

    // Always expose one readiness Promise, whether the initial
    // data is synchronous or asynchronous.
    this.ready = this._initialize(initialCells);

    // Prevent an unhandled-rejection warning when callers rely on
    // runCells but don't explicitly await notebook.ready.
    // Awaiting notebook.ready still rejects if the initial cells
    // collection itself fails to load.
    this.ready.catch(() => {});

    if (runCells) {
      this.ready
        .then(() => this.runAllCells())
        .catch((error) => {
          console.error("Failed to initialize notebook:", error);
        });
    }
  }

  /**
   * Resolve the initial cells array, normalize it, render it,
   * and resolve any Promise-based cell code.
   */
  async _initialize(initialCells) {
    const resolvedCells = await initialCells;

    if (!Array.isArray(resolvedCells)) {
      throw new TypeError(
        "Notebook cells must be an array or a Promise resolving to an array."
      );
    }

    this._replaceInitialCells(resolvedCells);
    await this._resolvePendingCellCode();

    return this;
  }

  /**
   * Normalize and replace initial cells.
   * Used for both synchronous and asynchronous initial data.
   */
  _replaceInitialCells(initialCells) {
    const startingCells =
      this.maxCells !== Infinity
        ? initialCells.slice(0, this.maxCells)
        : initialCells;

    const ids = startingCells
      .map((cell) => cell.id)
      .filter((id) => Number.isFinite(id));

    this.nextCellId = ids.length ? Math.max(...ids) + 1 : 1;

    const normalizedCells = startingCells.map((cell) => {
      const id = cell.id ?? this.nextCellId++;
      const source = cell.code ?? "";
      const pendingCode = isPromiseLike(source)
        ? Promise.resolve(source)
        : null;

      return {
        id,
        type: cell.type || "code",
        code: pendingCode
          ? ""
          : typeof source === "string"
            ? source
            : "",
        _codePromise: pendingCode,
        _codeLoadError: null,

        readonly: cell.readonly ?? false,
        runtime: cell.runtime || null,
        isEditingMarkdown: cell.readonly
          ? false
          : (cell.isEditingMarkdown ?? true),
        execCount: cell.execCount ?? null,
        outputNode: cell.outputNode || null,
        hasDomOutput: cell.hasDomOutput ?? false,

        _copiedFlag: false,
        _dom: null,
        _editor: null,
        _actions: null,
        _inPrompt: null,
        _outPrompt: null,
        _bodySlot: null,
        _outputGrid: null,
        _outputRef: null,
      };
    });

    this.store.set("cells", normalizedCells);
    this.store.set(
      "activeCellId",
      normalizedCells.length ? normalizedCells[0].id : null
    );

    this._renderAllCells();
  }

  /**
   * Resolve every pending code source independently.
   * A single failed code request does not block other cells.
   */
  async _resolvePendingCellCode() {
    const cells = this.store.get("cells");

    await Promise.all(
      cells.map((cell) => this._resolveCellCode(cell))
    );
  }

  async _resolveCellCode(cellData) {
    if (!cellData._codePromise) {
      return !cellData._codeLoadError;
    }

    const sourcePromise = cellData._codePromise;

    try {
      const code = await resolveCode(sourcePromise);

      // Ignore stale results if the cell's source was replaced
      // while the previous Promise was still pending.
      if (cellData._codePromise !== sourcePromise) {
        return false;
      }

      cellData.code = code;
      cellData._codePromise = null;
      cellData._codeLoadError = null;

      if (cellData._dom) {
        this._refreshCell(cellData);
      }

      return true;
    } catch (error) {
      if (cellData._codePromise !== sourcePromise) {
        return false;
      }

      cellData._codePromise = null;
      cellData._codeLoadError = error;

      if (cellData._outputRef) {
        cellData._outputRef.replaceChildren();
        ErrorOutput(error).mount(cellData._outputRef);
        cellData.hasDomOutput = true;

        if (cellData._dom) {
          this._refreshCell(cellData);
        }
      }

      console.error(
        `Failed to load code for notebook cell ${cellData.id}:`,
        error
      );

      return false;
    }
  }

  _isMaxCellsReached() {
    return this.store.get("cells").length >= this.maxCells;
  }

  _cellActions(cellData) {
    const app = this;

    return {
      setActive: () => app.setActiveCell(cellData.id),

      runCode: async (autoNext = true) => {
        // If this cell's code is still loading, wait for it.
        await app._resolveCellCode(cellData);

        if (cellData._codeLoadError) {
          return;
        }

        const code = cellData._editor.getValue();
        cellData.code = code;

        if (cellData.type === "markdown") {
          cellData.isEditingMarkdown = false;

          if (autoNext) {
            app.nextCell(cellData.id, "markdown");
          } else {
            app._refreshCell(cellData);
          }

          return;
        }

        if (!code.trim()) return;

        cellData._outputRef.replaceChildren();

        let hasError = false;

        try {
          const scope = app.getScope();

          await evaluateCodeAsync(
            code,
            cellData._outputRef,
            {
              importMap: app.importMap,
              plugins: app.runtimePlugins,
              runtime: cellData.runtime,
            },
            scope
          );
        } catch (error) {
          hasError = true;
          ErrorOutput(error).mount(cellData._outputRef);
        }

        const counter = app.store.get("executionCounter");

        app.store.set("executionCounter", counter + 1);
        cellData.execCount = counter;
        cellData.hasDomOutput =
          cellData._outputRef.childNodes.length > 0 || hasError;

        // Output mounting remains handled by the existing component
        // lifecycle / autoMount behavior.
        if (autoNext && !hasError) {
          app.nextCell(cellData.id, "code");
        }

        app._refreshCell(cellData);
      },

      copyCode: async () => {
        const textToCopy =
          cellData._editor.getValue() || cellData.code;

        try {
          await navigator.clipboard.writeText(textToCopy);
        } catch {
          const temporary = tags.textarea(textToCopy).mount(
            document.body
          );

          temporary.element.select();
          document.execCommand("copy");
          temporary.unmount();
        }
      },

      toggleReadonly: () => {
        cellData.readonly = !cellData.readonly;

        if (
          cellData.readonly &&
          cellData.type === "markdown"
        ) {
          cellData.isEditingMarkdown = false;
        }

        app._refreshCell(cellData);
      },

      toggleType: () => {
        if (cellData.readonly) return;

        cellData.type =
          cellData.type === "code" ? "markdown" : "code";

        cellData.isEditingMarkdown = true;
        cellData.hasDomOutput = false;

        app._refreshCell(cellData);
      },

      editMarkdown: () => {
        if (cellData.readonly) return;

        cellData.isEditingMarkdown = true;
        app._refreshCell(cellData);
      },

      addBelow: () => {
        app.setActiveCell(cellData.id);
        app.addCell(cellData.type, null, cellData.id);
      },

      deleteCell: () => app.deleteCell(cellData.id),

      setRuntime: (newRuntime) => {
        cellData.runtime = newRuntime;
        app._refreshCell(cellData);
      },
    };
  }

  _buildCellDom(cellData) {
    return CellItem({
      cellData,
      app: this,
      store: this.store,
    });
  }

  _refreshCell(cellData) {
    if (!cellData._dom) return;

    const activeId = this.store.get("activeCellId");
    const isActive = activeId === cellData.id;

    cellData._dom.className =
      `cell ${isActive ? "active" : ""} ${
        cellData.readonly ? "readonly" : ""
      }`.trim();

    const countText = cellData.execCount
      ? `[${cellData.execCount}]`
      : "[ ]";

    const isMarkdownView =
      cellData.type === "markdown" &&
      !cellData.isEditingMarkdown;

    cellData._inPrompt.textContent =
      cellData.type === "code" ? `In ${countText}:` : "";

    cellData._editor.sync(isActive, isMarkdownView);

    cellData._bodySlot.replaceChildren(
      isMarkdownView
        ? MarkdownView({
            cellData,
            actions: cellData._actions,
            remarkPlugins: this.remarkPlugins,
            rehypePlugins: this.rehypePlugins,
          })
        : cellData._editor.dom
    );

    const showOutput =
      cellData.type === "code" && cellData.hasDomOutput;

    cellData._outputGrid.style.display =
      showOutput ? "grid" : "none";

    cellData._outPrompt.textContent = `Out ${countText}:`;
  }

  _renderAllCells() {
    const cells = this.store.get("cells");

    this.cellsContainer.replaceChildren(
      ...cells.map(
        (cell) => cell._dom || this._buildCellDom(cell)
      )
    );
  }

  setActiveCell(id) {
    const cells = this.store.get("cells");
    const target = cells.find((cell) => cell.id === id);

    if (!target) return;

    const currentActiveId = this.store.get("activeCellId");

    if (currentActiveId === id) return;

    cells.forEach((cell) => {
      if (cell.id !== id && cell.type === "markdown") {
        cell.isEditingMarkdown = false;
      }
    });

    this.store.set("activeCellId", id);

    cells.forEach((cell) => {
      if (cell._dom) {
        this._refreshCell(cell);
      }
    });
  }

  focusCell(id) {
  const cells = this.store.get("cells");
  const cell = cells.find((c) => c.id === id);

  if (!cell) return;

  for (const c of cells) {
    if (c.type === "markdown" && c.id !== id) {
      c.isEditingMarkdown = false;
    }
  }

  if (cell.type === "markdown" && !cell.readonly) {
    cell.isEditingMarkdown = true;
  }

  this.store.set("activeCellId", id);
  this._refreshCell(cell);

  // Scroll the target cell into view when it is outside the viewport.
  requestAnimationFrame(() => {
    const element = cell._dom;

    if (!element?.isConnected) return;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (rect.top < 0 || rect.bottom > viewportHeight) {
      element.scrollIntoView({
        behavior: "smooth",
        block: rect.top < 0 ? "start" : "nearest",
      });
    }
  });
}

  

addCell(type = "code", initialCode = null, afterId = null, readonly = false) {
  const cells = [...this.store.get("cells")];

  if (cells.length >= this.maxCells) {
    console.warn(
      `Cannot create cell: Maximum cell limit (${this.maxCells}) reached.`
    );
    return null;
  }

  // Prefer the cell associated with the clicked "+" button.
  // Fall back to the last focused cell, then the last cell.
  const sourceCell =
    (afterId !== null
      ? cells.find((cell) => cell.id === afterId)
      : null) ??
    cells.find(
      (cell) => cell.id === this.store.get("activeCellId")
    ) ??
    cells.at(-1);

  const newId = this.nextCellId++;
  const defaultText =
    type === "markdown"
      ? "### New Markdown Cell\nClick to edit..."
      : "";

  const newCell = {
    id: newId,
    type,
    code: initialCode !== null ? initialCode : defaultText,
    readonly,
    isEditingMarkdown:
      !readonly && type === "markdown" && initialCode === null,
    runtime: sourceCell?.runtime ?? null,
    execCount: null,
    outputNode: null,
    hasDomOutput: false,
    _copiedFlag: false,
    _dom: null,
    _editor: null,
    _actions: null,
    _inPrompt: null,
    _outPrompt: null,
    _bodySlot: null,
    _outputGrid: null,
    _outputRef: null,
  };

  if (afterId === null) {
    cells.push(newCell);
  } else {
    const index = cells.findIndex((cell) => cell.id === afterId);
    if (index === -1) {
      cells.push(newCell);
    } else {
      cells.splice(index + 1, 0, newCell);
    }
  }

  this.store.set("cells", cells);
  this._renderAllCells();
  this.focusCell(newId);

  return newId;
}

  deleteCell(id) {
    const cells = this.store.get("cells");

    if (cells.length <= 1) return;

    const index = cells.findIndex((cell) => cell.id === id);
    const updatedCells = cells.filter(
      (cell) => cell.id !== id
    );

    this.store.set("cells", updatedCells);
    this._renderAllCells();

    const nextActiveIndex = Math.min(
      Math.max(index, 0),
      updatedCells.length - 1
    );

    this.focusCell(updatedCells[nextActiveIndex].id);
  }

  
nextCell(currentId, defaultType) {
  const cells = this.store.get("cells");
  const index = cells.findIndex((cell) => cell.id === currentId);

  if (index === -1) return;

  if (index === cells.length - 1) {
    const newId = this.addCell(defaultType, null, currentId);

    if (newId !== null) {
      this.focusCell(newId);
    }

    return;
  }

  this.focusCell(cells[index + 1].id);
}

  async runCell(id) {
    await this.ready;

    const cell = this.store
      .get("cells")
      .find((item) => item.id === id);

    if (cell?._actions) {
      await cell._actions.runCode(false);
    }
  }

  async runAllCells() {
    await this.ready;

    const cells = this.store.get("cells");
    const codeCells = cells.filter(
      (cell) => cell.type === "code"
    );

    if (codeCells.length === 0) return;

    this.store.set("executionQueueState", {
      isRunning: true,
      currentIndex: 0,
      total: codeCells.length,
    });

    try {
      for (const cell of cells) {
        if (cell.type !== "code" || !cell._actions) {
          continue;
        }

        this.store.set("executionQueueState", {
          isRunning: true,
          currentIndex: codeCells.indexOf(cell),
          total: codeCells.length,
        });

        await cell._actions.runCode(false);
      }
    } finally {
      this.store.set("executionQueueState", {
        isRunning: false,
        currentIndex: 0,
        total: 0,
      });
    }
  }

  clearOutputs() {
    this.store.get("cells").forEach((cell) => {
      cell.execCount = null;
      cell.outputNode = null;
      cell.hasDomOutput = false;

      if (cell._outputRef) {
        cell._outputRef.replaceChildren();
      }
    });

    this.store.set("executionCounter", 1);

    this.store.get("cells").forEach((cell) => {
      this._refreshCell(cell);
    });
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
    if (
      !window.__notebook_scope_map ||
      !window.__notebook_scope_map.has(this.id)
    ) {
      return this.resetScope();
    }

    return window.__notebook_scope_map.get(this.id);
  }

  
getNotebookData({ inputs = true, outputs = true } = {}) {
  return this.store.get("cells").map((cell) => {
    const exportedCell = {
      id: cell.id,
      type: cell.type,
      readonly: cell.readonly,
      runtime: cell.runtime ?? null,
      order: cell.execCount,
    };

    if (inputs) {
      exportedCell.code = cell._editor?.getValue() ?? cell.code;
    }

    if (outputs) {
      exportedCell.outputHtml = cell.outputNode
        ? cell.outputNode.innerHTML
        : cell._outputRef?.innerHTML ?? null;
    }

    return exportedCell;
  });
}
}

export const Notebook = call_with_optional_props(UINotebook);