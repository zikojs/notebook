import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";

import { createFeed } from "../feed/createFeed.js";
import { nodeEntry } from "../entries/entryNode.js";

import { ConsoleToolbar } from "./ConsoleToolbar.js";
import { ConsoleBody } from "./ConsoleBody.js";
import { ConsolePrompt } from "./ConsolePrompt.js";

import { Hook } from "../hook/index.js";
import {
  fmt,
  safe
} from "../utils/index.js";

const { div } = van.tags;

const LEVEL = {
  log: "log",
  dir: "log",
  table: "log",
  group: "log",

  info: "info",
  debug: "debug",
  warn: "warn",
  error: "error"
};

const LEVELS = [
  "log",
  "info",
  "warn",
  "error",
  "debug"
];

const isProps = value =>
  value &&
  typeof value === "object" &&
  !(value instanceof Node) &&
  Object.getPrototypeOf(value) === Object.prototype;

export function ConsoleFeed(...args) {
  const [props, ...children] =
    isProps(args[0])
      ? args
      : [{}, ...args];

  const {
    feed = createFeed(),
    variant = "dark",
    repl = true,
    hook = false
  } = props;

  if (hook) {
    Hook(console, feed.push);
  }

  children
    .flat(Infinity)
    .forEach(child => {
      const entry = nodeEntry.get(child);

      if (entry) {
        feed.push(entry);
      }
    });

  const theme =
    typeof variant === "string"
      ? van.state(variant)
      : variant;

  const levels = Object.fromEntries(
    LEVELS.map(level => [
      level,
      van.state(true)
    ])
  );

  const query = van.state("");

  const count = level =>
    van.derive(() =>
      feed.logs.val.filter(
        entry =>
          LEVEL[entry.method] === level
      ).length
    );

  const visible = van.derive(() => {
    const search =
      query.val.toLowerCase();

    return feed.logs.val.filter(entry => {
      const level =
        LEVEL[entry.method];

      if (
        level &&
        !levels[level].val
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      return fmt(entry.args)
        .map(safe)
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  });

  return div(
    {
      class: () =>
        "cf " + theme.val,

      style: "flex:1"
    },

    ConsoleToolbar({
      levels,
      query,
      count,
      clear: feed.clear
    }),

    ConsoleBody(visible),

    repl
      ? ConsolePrompt({ feed })
      : ""
  );
}