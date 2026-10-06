import {
    isObj,
    prim,
    primCls,
    nodeLabel,
    label,
    short,
    preview,
    entriesOf
} from '../utils/index.js'

import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js"
const {div, span} = van.tags
export function Inspect({v, key, seen = [], top = false} = {}) {
  // console.log({v, key, seen, top})
  const k = key === undefined ? "" : span({class: "cf-k"}, key, ": ")
  const leaf = (cls, t) => span({class: "cf-" + cls}, k, t)

  if (v instanceof Error) {
    const s = v.stack?.includes(v.message) ? v.stack : `${v.name}: ${v.message}\n${v.stack || ""}`
    return div({class: "cf-err"}, k, s)
  }
  if (top && typeof v === "string") return span(v)
  if (typeof v === "function") return leaf("fn", short(v))
  if (!isObj(v)) return leaf(primCls(v), prim(v))
  if (v instanceof Date || v instanceof RegExp) return leaf("str", short(v))
  if (typeof Node !== "undefined" && v instanceof Node) return leaf("nul", nodeLabel(v))
  if (seen.includes(v)) return leaf("nul", "[Circular]")

  const es = entriesOf(v)
  if (!es.length) return leaf("nul", (label(v) ? label(v) + " " : "") + (Array.isArray(v) ? "[]" : "{}"))

  const open = van.state(false), chain = [...seen, v]
  return div({class: "cf-node"},
    div({class: () => "cf-t" + (open.val ? " open" : ""), onclick: () => open.val = !open.val},
      k, () => open.val ? (label(v) || "Object") : preview(v)),
    () => open.val ? div({class: "cf-kids"}, es.map(([kk, x]) => Inspect(x, kk, chain))) : "")
}