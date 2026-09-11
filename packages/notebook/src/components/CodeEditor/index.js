import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";

export const CodeEditor = ({ cellData, actions, notebookGlobalShortcuts, userCodeMirrorConfig = {}, codeMirrorPlugins = [], minLines = 3 }) => {
  const editorDom = document.createElement("div");
  editorDom.className = "input-wrapper";
  let editorView = null;

  const initCodeMirror = () => {
    if (!editorDom || editorView) return;

    const getLanguageExtension = (type) => type === "markdown" ? markdown() : javascript();

    const customKeymaps = keymap.of([
      { key: "Shift-Enter", run: () => { actions.runCode(true); return true; } },
      { key: "Ctrl-Enter", run: () => { actions.runCode(false); return true; } },
      { key: "Cmd-Enter", run: () => { actions.runCode(false); return true; } },
      { key: "Ctrl-Shift-D", run: () => { notebookGlobalShortcuts.deleteActive(); return true; } },
      { key: "Cmd-Shift-D", run: () => { notebookGlobalShortcuts.deleteActive(); return true; } },
      { key: "Ctrl-Shift-M", run: () => { notebookGlobalShortcuts.addMdBelow(); return true; } },
      { key: "Cmd-Shift-M", run: () => { notebookGlobalShortcuts.addMdBelow(); return true; } },
      { key: "Ctrl-Shift-Y", run: () => { notebookGlobalShortcuts.addCodeBelow(); return true; } },
      { key: "Cmd-Shift-Y", run: () => { notebookGlobalShortcuts.addCodeBelow(); return true; } },
      ...defaultKeymap,
      ...historyKeymap
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        cellData.code = update.state.doc.toString();
      }
      if (update.focusChanged && update.view.hasFocus) {
        actions.setActive();
      }
    });

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      bracketMatching(),
      customKeymaps,
      getLanguageExtension(cellData.type),
      updateListener,
      EditorView.lineWrapping,
      ...codeMirrorPlugins
    ];

    if (cellData.readonly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({
      doc: cellData.code,
      extensions
    });

    editorView = new EditorView({
      state,
      parent: editorDom
    });

    // Compute min lines height dynamically
    const lineHeight = 19; 
    const minHeightPx = Math.ceil(minLines * lineHeight + 8);
    editorView.dom.style.minHeight = `${minHeightPx}px`;
    editorView.dom.style.border = "1px solid #cbd5e1";
    editorView.dom.style.borderRadius = "4px";
  };

  return {
    dom: editorDom,
    getValue: () => editorView ? editorView.state.doc.toString() : cellData.code,
    sync: (isActive, isMarkdownView) => {
      if (!isMarkdownView) {
        if (!editorView) {
          requestAnimationFrame(() => initCodeMirror());
        } else {
          // Sync language mode or content if modified externally
          const currentDoc = editorView.state.doc.toString();
          if (currentDoc !== cellData.code) {
            editorView.dispatch({
              changes: { from: 0, to: currentDoc.length, insert: cellData.code }
            });
          }
        }
        if (isActive && editorView && !cellData.readonly) {
          requestAnimationFrame(() => editorView.focus());
        }
      } else {
        editorView = null;
      }
    }
  };
};