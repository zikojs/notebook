import './index.css'
import van from "vanjs-core";
import './van-ziko.js'
import * as acorn from "acorn";
import { 
    NotebookCell,
    Header
 } from "./components/index.js";

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

    window.__notebook_scope = Object.create(null);

    this.nextCellId = van.state(initialCells.length ? Math.max(...initialCells.map(c => c.id || 0)) + 1 : 1);
    const startingCells = maxCells !== Infinity ? initialCells.slice(0, maxCells) : initialCells;

    this.cells = van.state(startingCells.map(cell => ({
      id: cell.id || this.nextCellId.val++,
      type: cell.type || "code",
      code: cell.code || "",
      readonly: cell.readonly ?? false,
      isEditingMarkdown: cell.readonly ? false : (cell.isEditingMarkdown ?? true),
      execCount: cell.execCount ?? null,
      outputNode: cell.outputNode || null,
      hasDomOutput: cell.hasDomOutput ?? false,
      _runActionRef: null
    })));

    this.activeCellId = van.state(this.cells.val.length ? this.cells.val[0].id : null);
    this.executionCounter = van.state(1);
    this.executionQueueState = van.state({ isRunning: false, currentIndex: 0, total: 0 });
    this.isMaxCellsReached = van.derive(() => this.cells.val.length >= this.maxCells);

    this.notebookGlobalShortcuts = {
      deleteActive: () => this.deleteCell(this.activeCellId.val),
      addMdBelow: () => this.addCell("markdown", "", this.activeCellId.val),
      addCodeBelow: () => this.addCell("code", "", this.activeCellId.val)
    };

    this.element = this._render();
    if (runCells) setTimeout(() => this.runAllCells(), 200);
  }

  #rewriteImportNode(node, code, importMapConfig) {
    let source = node.source.value;
    if (importMapConfig && importMapConfig[source]) source = importMapConfig[source];
    else if (!source.startsWith("http") && !source.startsWith("./") && !source.startsWith("../")) {
      source = `https://esm.sh/${source}`;
    }
    if (node.specifiers.length === 0) return `await import("${source}");`;
    
    let defaultImportName = null, namespaceId = null;
    let namedImports = [];
    node.specifiers.forEach(spec => {
      if (spec.type === 'ImportNamespaceSpecifier') namespaceId = spec.local.name;
      else if (spec.type === 'ImportDefaultSpecifier') defaultImportName = spec.local.name;
      else if (spec.type === 'ImportSpecifier') namedImports.push({ imported: spec.imported.name, local: spec.local.name });
    });

    if (namespaceId) return `window.__notebook_scope.${namespaceId} = await import("${source}");`;
    const tmp = `__mod_${node.start}`;
    let lines = [`const ${tmp} = await import("${source}");`];
    if (defaultImportName) lines.push(`window.__notebook_scope.${defaultImportName} = ${tmp}.default ?? ${tmp};`);
    namedImports.forEach(({ imported, local }) => {
      lines.push(`window.__notebook_scope.${local} = ${tmp}.${imported} !== undefined ? ${tmp}.${imported} : (${tmp}.default ?? ${tmp});`);
    });
    return lines.join('\n');
  }

  #transformImportsAndScope(code, importMapConfig) {
    try {
      const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true });
      let modifications = [];

      ast.body.forEach(node => {
        if (node.type === 'ImportDeclaration') {
          modifications.push({ start: node.start, end: node.end, replacement: this.#rewriteImportNode(node, code, importMapConfig) });
        } else if (node.type === 'VariableDeclaration') {
          let replacementCode = "";
          node.declarations.forEach(decl => {
            if (decl.id.type === 'Identifier') {
              const varName = decl.id.name;
              const initCode = decl.init ? code.slice(decl.init.start, decl.init.end) : 'undefined';
              replacementCode += `window.__notebook_scope.${varName} = ${initCode};\n`;
            }
          });
          modifications.push({ start: node.start, end: node.end, replacement: replacementCode });
        }
      });

      modifications.sort((a, b) => b.start - a.start);
      let transformedCode = code;
      modifications.forEach(mod => { transformedCode = transformedCode.slice(0, mod.start) + mod.replacement + transformedCode.slice(mod.end); });
      return transformedCode;
    } catch (e) {
      return code;
    }
  }

async evaluateCodeAsync(code, TARGET, importMapConfig) {
    // Expose van and TARGET to the evaluation scope
    window.__notebook_scope.van = window.__notebook_scope.van || van;
    window.__notebook_scope.TARGET = TARGET;

    const compiledCode = this.#transformImportsAndScope(code, importMapConfig);
    const asyncWrapper = `(async () => { 
      with (window.__notebook_scope) {
        ${compiledCode} 
      }
    })()`;
    
    const result = await (0, eval)(asyncWrapper);
    if (result !== undefined && result !== null) {
      van.add(TARGET, result);
    }
  }
  switchActiveCell(newActiveId, skipStateRefresh = false) {
    if (this.activeCellId.val === newActiveId && !skipStateRefresh) return;
    this.activeCellId.val = newActiveId;
    if (!skipStateRefresh) this.updateCells();
  }

  focusCell(targetId) {
    this.switchActiveCell(targetId, true);
    this.updateCells();
  }

  updateCells() { this.cells.val = [...this.cells.val]; }

  addCell(type = "code", initialCode = null, afterId = null, readonly = false) {
    if (this.isMaxCellsReached.val) return null;
    const newId = this.nextCellId.val++;
    const newCell = {
      id: newId, type, code: initialCode ?? (type === "markdown" ? "### New Markdown" : ""),
      readonly, isEditingMarkdown: !readonly && type === "markdown", execCount: null, outputNode: null, hasDomOutput: false
    };
    if (afterId === null) this.cells.val = [...this.cells.val, newCell];
    else {
      const idx = this.cells.val.findIndex(c => c.id === afterId);
      const updated = [...this.cells.val];
      updated.splice(idx + 1, 0, newCell);
      this.cells.val = updated;
    }
    this.focusCell(newId);
    return newId;
  }

  deleteCell(id) {
    if (this.cells.val.length > 1) {
      const idx = this.cells.val.findIndex(c => c.id === id);
      const remaining = this.cells.val.filter(c => c.id !== id);
      this.cells.val = remaining;
      this.focusCell(remaining[Math.min(idx, remaining.length - 1)].id);
    }
  }

  nextCell(currentId, defaultType) {
    const idx = this.cells.val.findIndex(c => c.id === currentId);
    if (idx === this.cells.val.length - 1) this.addCell(defaultType, null, currentId);
    else this.focusCell(this.cells.val[idx + 1].id);
  }

  async runAllCells() {
    for (let cell of this.cells.val) {
      if (cell.type === "code" && typeof cell._runActionRef === "function") {
        await cell._runActionRef(false);
      }
    }
  }

  clearOutputs() {
    this.cells.val.forEach(cell => { cell.execCount = null; cell.outputNode = null; cell.hasDomOutput = false; });
    this.executionCounter.val = 1;
    this.updateCells();
  }

  _render() {
    const actions = {
      setActiveCell: (id) => this.switchActiveCell(id),
      updateCells: () => this.updateCells(),
      createCell: (afterId, type) => this.addCell(type, null, afterId),
      deleteCell: (id) => this.deleteCell(id),
      nextCell: (currentId, type) => this.nextCell(currentId, type)
    };

    return div(
      Header({
        onAddCode: () => this.addCell("code", "", this.activeCellId.val),
        onAddMarkdown: () => this.addCell("markdown", "", this.activeCellId.val),
        onDeleteActive: () => this.deleteCell(this.activeCellId.val),
        onExport: () => console.log(this.cells.val),
        onRunAll: () => this.runAllCells(),
        onClearOutputs: () => this.clearOutputs(),
        executionQueueState: this.executionQueueState,
        isMaxCellsReached: this.isMaxCellsReached
      }),
      div({ class: "notebook" },
        () => div({ style: "display: flex; flex-direction: column; gap: 8px;" },
          this.cells.val.map(cellData => NotebookCell({
            cellData, activeCellId: this.activeCellId, actions,
            executionCounter: this.executionCounter, executionQueueState: this.executionQueueState,
            codeMirrorConfig: this.codeMirrorConfig, importMap: this.importMap,
            notebookGlobalShortcuts: this.notebookGlobalShortcuts, codeMirrorPlugins: this.codeMirrorPlugins,
            minLines: this.minLines, isMaxCellsReached: this.isMaxCellsReached,
            evaluateCodeAsync: (code, target, map) => this.evaluateCodeAsync(code, target, map)
          }))
        )
      )
    );
  }
}