import { isObj, prim, short } from "../utils/index.js";
import { tags } from "ziko/dom";
const { table, thead, tbody, tr, th, td } = tags;
export function Table(data) {
  const rows = Array.isArray(data)
    ? data.map((x, i) => [i, x])
    : data instanceof Map
      ? [...data].map(([a, b]) => [short(a), b])
      : Object.entries(data);
  const cols = [
    ...new Set(rows.flatMap(([, x]) => (isObj(x) ? Object.keys(x) : []))),
  ];
  const hasVal = rows.some(([, x]) => !isObj(x));
  return table(
    { class: "cf-table" },
    thead(
      tr(
        th("(index)"),
        cols.map((c) => th(c)),
        hasVal ? th("Value") : "",
      ),
    ),
    tbody(
      ...rows.map(([i, x]) =>
        tr(
          td(i),
          cols.map((c) => td(isObj(x) && c in x ? short(x[c]) : "")),
          hasVal ? td(isObj(x) ? "" : prim(x)) : "",
        ),
      ),
    ),
  ).element;
}
