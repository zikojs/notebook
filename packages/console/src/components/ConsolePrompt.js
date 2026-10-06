import { tags } from "ziko/dom";
const { div, span, input } = tags;
export function ConsolePrompt({
  feed
}) {
  const history = [];
  let index = 0;

  const run = code => {
    feed.push({
      method: "command",
      args: [code]
    });

    try {
      feed.push({
        method: "result",
        args: [(0, eval)(code)]
      });
    } catch (error) {
      feed.push({
        method: "error",
        args: [error]
      });
    }
  };

  const inp = input({
      placeholder: "Run JavaScript",
      "aria-label": "Run JavaScript",
      spellcheck: false,
      autocomplete: "off",

      onKeyDown: __e__ => {
        const e = __e__.event
        const el = e.target;

        if (
          e.key === "Enter" &&
          el.value.trim()
        ) {
          history.push(el.value);
          index = history.length;

          run(el.value);

          el.value = "";
        }

        else if (
          e.key === "ArrowUp" &&
          index > 0
        ) {
          el.value = history[--index];
          e.preventDefault();
        }

        else if (e.key === "ArrowDown") {
          el.value =
            index < history.length - 1
              ? history[++index]
              : (index = history.length, "");
        }
      }
    })

  return div(
    { class: "cf-prompt" },

    span("\u203A"),
    inp
    
  ).element;
}