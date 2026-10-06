import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";

const {
  div,
  button,
  input
} = van.tags;

export function ConsoleToolbar({
  levels,
  query,
  count,
  clear
}) {
  const LEVELS = [
    "log",
    "info",
    "warn",
    "error",
    "debug"
  ];

  return div(
    { class: "cf-bar" },

    LEVELS.map(level =>
      button(
        {
          class: () =>
            `cf-chip ${level}` +
            (levels[level].val ? " on" : ""),

          "aria-pressed": () =>
            levels[level].val,

          onclick: () =>
            levels[level].val =
              !levels[level].val
        },

        level,
        " ",
        count(level)
      )
    ),

    input({
      type: "search",
      placeholder: "Filter messages",
      "aria-label": "Filter messages",

      oninput: e =>
        query.val = e.target.value
    }),

    button(
      { onclick: clear },
      "Clear"
    )
  );
}