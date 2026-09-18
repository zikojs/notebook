import van from "vanjs-core";

import Play from "@zikojs/lucide/Play";
import Plus from "@zikojs/lucide/Plus";
import Trash2 from "@zikojs/lucide/Trash2"
import Download from "@zikojs/lucide/Download"
import Eraser from "@zikojs/lucide/Eraser"
import FileText from "@zikojs/lucide/FileText"


const { div, button, span, i } = van.tags;

const Button = ({ class: className = "", title = "", disabled = false, onclick }, ...children) =>
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
      Button(
        { class: "btn-primary", disabled: () => executionQueueState.val.isRunning, onclick: onRunAll },
        Play({ class : 'icon'}).element, "Run All"
      ),
      Button(
        { disabled: () => executionQueueState.val.isRunning, onclick: onClearOutputs},
        Eraser({ class : 'icon'}).element, "Clear Outputs"
      ),
      Button(
        { disabled: () => executionQueueState.val.isRunning || isMaxCellsReached.val, onclick: onAddCode },
        Plus({ class : 'icon'}).element, "Add Code"
      ),
      Button(
        { disabled: () => executionQueueState.val.isRunning || isMaxCellsReached.val, onclick: onAddMarkdown },
        FileText({ class : 'icon'}).element, "Add Markdown"
      ),
      Button(
        { disabled: () => executionQueueState.val.isRunning, onclick: onDeleteActive},
        Trash2({ class : 'icon'}).element, "Delete Active" 
      ),
      Button(
        { disabled: () => executionQueueState.val.isRunning, onclick: onExport },
        Download({ class : 'icon'}).element, "Export Data"
      )
    )
  );