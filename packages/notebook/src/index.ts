
import type { UIElement } from "ziko/dom/UIElement";

export type MaybePromise<T> = T | PromiseLike<T>;

export interface NotebookCell {
  id?: number;
  type?: "code" | "markdown";
  code?: MaybePromise<string>;
  readonly?: boolean;
  runtime?: string | null;
  isEditingMarkdown?: boolean;
  execCount?: number | null;
  outputNode?: HTMLElement | null;
  hasDomOutput?: boolean;
}

export type NotebookCells = MaybePromise<NotebookCell[]>;

export interface NotebookOptions {
  /**
   * Initial cells, or a Promise resolving to the cells.
   */
  cells?: NotebookCells;

  importMap?: Record<string, string>;
  runCells?: boolean;
  minLines?: number;
  maxCells?: number;
  showHeader?: boolean;
  codeMirrorConfig?: unknown[] | Record<string, unknown>;
  codeMirrorPlugins?: unknown[];
  runtimePlugins?: Array<{
    name: string;
    [key: string]: unknown;
  }>;
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
}

export declare class UINotebook extends UIElement {
  constructor(options?: NotebookOptions);

  /**
   * Resolves when initial cells and Promise-based cell code
   * have finished loading.
   *
   * Rejects if the initial cells source fails or does not
   * resolve to an array. Individual code-source failures are
   * displayed in their respective cells.
   */
  readonly ready: Promise<this>;

  readonly id: string;

  importMap: Record<string, string>;
  runtimePlugins: NotebookOptions["runtimePlugins"];
  codeMirrorConfig: NotebookOptions["codeMirrorConfig"];
  codeMirrorPlugins: unknown[];
  remarkPlugins: unknown[];
  rehypePlugins: unknown[];
  minLines: number;
  maxCells: number;

  runCell(id: number): Promise<void>;
  runAllCells(): Promise<void>;

  addCell(
    type?: "code" | "markdown",
    initialCode?: MaybePromise<string> | null,
    afterId?: number | null,
    readonly?: boolean
  ): number | null;

  deleteCell(id: number): void;
  setActiveCell(id: number): void;
  focusCell(id: number): void;
  clearOutputs(): void;
  resetScope(): Record<string, unknown>;
  getScope(): Record<string, unknown>;

  getNotebookData(options?: {
    inputs?: boolean;
    outputs?: boolean;
  }): Array<{
    id: number;
    type: "code" | "markdown";
    readonly: boolean;
    order: number | null;
    code?: string;
    outputHtml?: string | null;
  }>;
}

export declare function Notebook(
  options?: NotebookOptions
): UINotebook;