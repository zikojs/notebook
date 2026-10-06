import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";
import { isObj } from "../utils/index.js";

export function createFeed(max = 1000) {
  const logs = van.state([]);

  let depth = 0;
  let id = 0;

  const same = (a, b) =>
    a.method === b.method &&
    a.depth === b.depth &&
    a.args.length === b.args.length &&
    a.args.every(
      (x, i) => !isObj(x) && Object.is(x, b.args[i])
    );

  const push = src => {
    const { method, args = [] } = src;

    if (method === "clear") {
      depth = 0;
      logs.val = [];
      return;
    }

    if (method === "groupEnd") {
      depth = Math.max(0, depth - 1);
      return;
    }

    const isGroup =
      method === "group" ||
      method === "groupCollapsed";

    const entry = src.count
      ? Object.assign(src, {
          id: ++id,
          depth
        })
      : {
          id: ++id,
          method: isGroup ? "group" : method,
          args,
          depth,
          count: van.state(1),
          time: new Date()
        };

    const last = logs.val.at(-1);

    if (last && !isGroup && same(last, entry)) {
      last.count.val++;
      return;
    }

    logs.val = [...logs.val, entry].slice(-max);

    if (isGroup) depth++;
  };

  return {
    logs,
    push,
    clear: () => push({ method: "clear" })
  };
}