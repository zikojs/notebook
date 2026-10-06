import {
  isObj,
  prim,
  primCls,
  nodeLabel,
  label,
  short,
  preview,
  entriesOf,
} from "../utils/index.js";

import { tags } from "ziko/dom";
import { useState, useDerived } from "ziko/hooks";

const { div, span } = tags;

export function Inspect(v, key, seen = [], top = false) {
  const k =
    key === undefined
      ? ""
      : span({ class: "cf-k" }, key, ": ");

  const leaf = (cls, t) =>
    span({ class: "cf-" + cls }, k, t);

  if (v instanceof Error) {
    const s = v.stack?.includes(v.message)
      ? v.stack
      : `${v.name}: ${v.message}\n${v.stack || ""}`;

    return div(
      { class: "cf-err" },
      k,
      s,
    );
  }

  if (top && typeof v === "string") {
    return span(v);
  }

  if (typeof v === "function") {
    return leaf("fn", short(v));
  }

  if (!isObj(v)) {
    return leaf(primCls(v), prim(v));
  }

  if (v instanceof Date || v instanceof RegExp) {
    return leaf("str", short(v));
  }

  if (typeof Node !== "undefined" && v instanceof Node) {
    return leaf("nul", nodeLabel(v));
  }

  if (seen.includes(v)) {
    return leaf("nul", "[Circular]");
  }

  const es = entriesOf(v);

  if (!es.length) {
    return leaf(
      "nul",
      (label(v) ? label(v) + " " : "") +
        (Array.isArray(v) ? "[]" : "{}"),
    );
  }

  const [open, setOpen] = useState(false);

  const header = useDerived(
    open => div(
      {
        class: "cf-t" + (open ? " open" : ""),
        onClick: () => setOpen(old => !old),
      },
      k,
      open
        ? label(v) || "Object"
        : preview(v),
    ),
    [open],
  );

  const children = useDerived(
  open => {
    const kids = open ? es.map(([kk, x]) => Inspect(x, kk, [...seen, v]).element) : []
    return div({ class: "cf-kids" }, ...kids)
  },
  [open],
);

  return div(
    { class: "cf-node" },
    header,
    children
  )
}