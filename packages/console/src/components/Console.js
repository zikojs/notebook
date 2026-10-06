import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";

import { entryNode, nodeEntry } from "../entries/entryNode.js";

export const Console = {
  theme: van.state("light")
};

Console.log = entryNode("log", Console.theme);
Console.info = entryNode("info", Console.theme);
Console.debug = entryNode("debug", Console.theme);
Console.warn = entryNode("warn", Console.theme);
Console.error = entryNode("error", Console.theme);
Console.table = entryNode("table", Console.theme);

Console.group = entryNode("group", Console.theme);

Console.groupEnd = () => {
  const node =
    document.createComment("groupEnd");

  nodeEntry.set(node, {
    method: "groupEnd",
    args: []
  });

  return node;
};