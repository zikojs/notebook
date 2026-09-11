import van from "vanjs-core";
import { createIcons, icons } from "lucide";

const { div, button, span, i } = van.tags;

const Icon = ({ name }) => {
  const iconEl = i({ class: "icon" });
  setTimeout(() => createIcons({ attrs: { class: "lucide" }, nameAttr: 'data-lucide', icons: { [name]: icons[name] } }), 0);
  return iconEl;
};

const Button = ({ class: className = "", title = "", disabled = false, onclick, children = [] }) =>
  button({ class: `btn ${className}`, title, disabled, onclick }, ...children);

export const Header = ({ onAddCode, onAddMarkdown, onDeleteActive, onExport, onRunAll, onClearOutputs, executionQueueState, isMaxCellsReached }) =>
  div({ class: "header" },
    div({ class: "brand" }, 
      "Jupyter VanJS Notebook",
      () => executionQueueState.val.isRunning
        ? span({ class: "status-badge" }, Icon({ name: "Loader2" }), `Executing Queue (${executionQueueState.val.currentIndex + 1}/${executionQueueState.val.total})`)
        : span()
    ),
    div({ class: "toolbar" },
      Button({ class: "btn-primary", disabled: () => executionQueueState.val.isRunning, onclick: onRunAll, children: [Icon({ name: "Play" }), "Run All"] }),
      Button({ disabled: () => executionQueueState.val.isRunning, onclick: onClearOutputs, children: [Icon({ name: "Eraser" }), "Clear Outputs"] }),
      Button({ disabled: () => executionQueueState.val.isRunning || isMaxCellsReached.val, onclick: onAddCode, children: [Icon({ name: "Plus" }), "Add Code"] }),
      Button({ disabled: () => executionQueueState.val.isRunning || isMaxCellsReached.val, onclick: onAddMarkdown, children: [Icon({ name: "FileText" }), "Add Markdown"] }),
      Button({ disabled: () => executionQueueState.val.isRunning, onclick: onDeleteActive, children: [Icon({ name: "Trash2" }), "Delete Active"] }),
      Button({ disabled: () => executionQueueState.val.isRunning, onclick: onExport, children: [Icon({ name: "Download" }), "Export Data"] })
    )
  );