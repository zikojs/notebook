import van from "vanjs-core";

import {
  FileText,
  Plus,
  Trash2,
  PlayForward,
  Eraser,
  Download,
  Loader2
} from '../icons/index.js';

const { button } = van.tags;

import { tags } from 'ziko/dom'

const { div, span } = tags

export const Button = ({ class: className = "", title = "", disabled = false, onclick }, ...children) =>
  button({ class: `btn ${className}`, title, disabled, onclick }, ...children);

export function Header({ store, actions }) {
  const statusBadge = span({ class: "status-badge" }, Loader2(), span('Loading ...'));
  const runAllBtn = Button({ class: "btn-primary", onclick: actions.runAll }, PlayForward(), "Run All");
  const clearBtn = Button({ onclick: actions.clearOutputs }, Eraser(), "Clear Outputs");
  const addCodeBtn = Button({ onclick: actions.addCode }, Plus(), "Add Code");
  const addMdBtn = Button({ onclick: actions.addMarkdown }, FileText(), "Add Markdown");
  const deleteActiveBtn = Button({ onclick: actions.deleteActive }, Trash2(), "Delete Active");
  const exportBtn = Button({ onclick: actions.exportData }, Download(), "Export Data");

  store.on('change:executionQueueState', (q) => {
    statusBadge.style({display :q.isRunning ? "inline-flex" : "none" })
    statusBadge.element.lastChild.textContent = `Executing Queue (${q.currentIndex + 1}/${q.total})`;
    [runAllBtn, clearBtn, deleteActiveBtn].forEach(b => { b.disabled = q.isRunning; });
    const maxReached = store.get('cells').length >= store.get('maxCells');
    addCodeBtn.disabled = q.isRunning || maxReached;
    addMdBtn.disabled = q.isRunning || maxReached;
  });

  return div({ class: "header" },
    div({ class: "brand" }, "</>", statusBadge),
    div({ class: "toolbar" }, 
      runAllBtn, clearBtn, addCodeBtn, addMdBtn, deleteActiveBtn, exportBtn
    )
  ).element;
}