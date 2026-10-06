import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";
import { createEntry } from "./createEntry.js";
import { Row } from "../components/Row.js";
const { div } = van.tags

export const nodeEntry = new WeakMap();

export const entryNode = (method, theme) => (...args) => {
  const entry = createEntry(method, args);

  const node = div(
    {
      class: () =>
        "cf cf-solo " + theme.val
    },
    Row(entry)
  );

  nodeEntry.set(node, entry);

  return node;
};
