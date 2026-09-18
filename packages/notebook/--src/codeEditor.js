import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import van from "vanjs-core";

// import { tags } from 'ziko/dom'

const { div } = van.tags;

const languageFor = (type) => (type === "markdown" ? markdown() : javascript());

export function createCodeEditor(app, cellData, actions) {
  const editorDom = div({ class: "input-wrapper" });

  const languageCompartment = new Compartment();
  const readOnlyCompartment = new Compartment();
  const editableCompartment = new Compartment();

  let view = null;

  const buildPluginKeymap = () => {
    const bindings = [];
    app.codeMirrorPlugins.forEach(plugin => {
      if (plugin && typeof plugin === "object" && plugin.extraKeys) {
        Object.entries(plugin.extraKeys).forEach(([key, run]) => {
          bindings.push({ key, run: () => { run(); return true; } });
        });
      }
    });
    return bindings;
  };

  const initEditor = () => {
    if (view) return;

    const shortcutKeymap = keymap.of([
      { key: "Shift-Enter", run: () => { actions.runCode(true); return true; } },
      { key: "Ctrl-Enter", mac: "Cmd-Enter", run: () => { actions.runCode(false); return true; } },
      { key: "Ctrl-Shift-d", mac: "Cmd-Shift-d", run: () => { app.notebookGlobalShortcuts.deleteActive(); return true; } },
      { key: "Ctrl-Shift-m", mac: "Cmd-Shift-m", run: () => { app.notebookGlobalShortcuts.addMdBelow(); return true; } },
      { key: "Ctrl-Shift-y", mac: "Cmd-Shift-y", run: () => { app.notebookGlobalShortcuts.addCodeBelow(); return true; } },
      ...buildPluginKeymap(),
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap
    ]);

    const extraExtensions = Array.isArray(app.codeMirrorConfig) ? app.codeMirrorConfig : [];

    const state = EditorState.create({
      doc: cellData.code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        closeBrackets(),
        shortcutKeymap,
        EditorView.lineWrapping,
        indentUnit.of("  "),
        EditorState.tabSize.of(2),
        languageCompartment.of(languageFor(cellData.type)),
        readOnlyCompartment.of(EditorState.readOnly.of(cellData.readonly)),
        editableCompartment.of(EditorView.editable.of(!cellData.readonly)),
        EditorView.updateListener.of(update => {
          if (update.docChanged) cellData.code = update.state.doc.toString();
        }),
        EditorView.domEventHandlers({
          focus: () => { actions.setActive(); }
        }),
        ...extraExtensions
      ]
    });

    view = new EditorView({ state, parent: editorDom });

    const lineHeight = view.defaultLineHeight || 19;
    view.dom.style.minHeight = `${Math.ceil(app.minLines * lineHeight + 8)}px`;

    app.codeMirrorPlugins.forEach(plugin => { if (typeof plugin === "function") plugin(view); });
  };

  return {
    dom: editorDom,
    getValue: () => (view ? view.state.doc.toString() : cellData.code),
    sync: (isActive, isMarkdownView) => {
      if (!isMarkdownView) {
        if (!view) {
          requestAnimationFrame(() => initEditor());
        } else {
          view.dispatch({
            effects: [
              languageCompartment.reconfigure(languageFor(cellData.type)),
              readOnlyCompartment.reconfigure(EditorState.readOnly.of(cellData.readonly)),
              editableCompartment.reconfigure(EditorView.editable.of(!cellData.readonly))
            ]
          });
          const currentValue = view.state.doc.toString();
          if (currentValue !== cellData.code) {
            view.dispatch({ changes: { from: 0, to: currentValue.length, insert: cellData.code } });
          }
        }
        if (isActive && view && !cellData.readonly) requestAnimationFrame(() => view.focus());
      } else if (view) {
        view.destroy();
        view = null;
      }
    }
  };
}