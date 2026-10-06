import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";

import {
  fmt,
  isObj
} from "../utils/index.js";

import { Inspect } from "./Inspect.js";
import { Table } from "./Table.js";

const { div, span } = van.tags;

const cache = new WeakMap();

const buildRow = entry => {
  const [a0, ...rest] = entry.args;

  const items =
    entry.method === "table" && isObj(a0)
      ? [
          Table(a0),
          ...rest.map(x =>
            Inspect(x, undefined, [], true).element
          )
        ]
      : fmt(entry.args).map(a =>
          Inspect(a, undefined, [], true).element
        );

  return div(
    {
      class: `cf-row ${entry.method}`,
      style: `--d:${entry.depth}`
    },

    () =>
      entry.count.val > 1
        ? span(
            { class: "cf-badge" },
            entry.count.val
          )
        : "",

    span(
      { class: "cf-time" },
      entry.time.toLocaleTimeString([], {
        hour12: false
      })
    ),

    div(
      { class: "cf-msg" },
      items
    )
  );
};

export const Row = entry =>
  cache.get(entry) ||
  (() => {
    const node = buildRow(entry);
    cache.set(entry, node);
    return node;
  })();