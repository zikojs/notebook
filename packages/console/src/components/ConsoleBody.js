import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";
import { Row } from "./Row.js";

const { div } = van.tags;

export function ConsoleBody(visible) {
  let stick = true;

  const body = div(
    {
      class: "cf-body",

      onscroll: () => {
        stick =
          body.scrollHeight -
          body.scrollTop -
          body.clientHeight < 24;
      }
    },

    () =>
      visible.val.length
        ? div(
            visible.val.map(entry =>
              Row(entry)
            )
          )
        : div(
            { class: "cf-empty" },
            "No messages yet. Anything sent to console.* shows up here."
          )
  );

  van.derive(() => {
    visible.val;

    requestAnimationFrame(() => {
      if (stick) {
        body.scrollTop =
          body.scrollHeight;
      }
    });
  });

  return body;
}