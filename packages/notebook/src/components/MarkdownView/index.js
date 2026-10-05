import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

import { tags } from "ziko/dom";

const { div } = tags;

/**
 * Activate elements inserted through innerHTML.
 *
 * Scripts created by innerHTML are inert, so recreate them
 * as real DOM nodes. This also handles external scripts.
 */
async function activateHTML(container) {
  const scripts = [
    ...container.querySelectorAll("script"),
  ];

  for (const oldScript of scripts) {
    const script = document.createElement("script");

    for (const attribute of oldScript.attributes) {
      script.setAttribute(
        attribute.name,
        attribute.value
      );
    }

    script.textContent = oldScript.textContent;

    oldScript.replaceWith(script);

    if (script.src) {
      await new Promise((resolve, reject) => {
        script.addEventListener(
          "load",
          resolve,
          { once: true }
        );

        script.addEventListener(
          "error",
          reject,
          { once: true }
        );
      });
    }
  }
}

export function MarkdownView({
  cellData,
  actions,
  remarkPlugins = [],
  rehypePlugins = [],
}) {
  const content = div();

  remark()
    .use(remarkPlugins)
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(rehypePlugins)
    .use(rehypeStringify)
    .process(cellData.code || "*Empty Markdown Cell*")
    .then(async (file) => {
      content.element.innerHTML = String(file);

      await activateHTML(content.element);
    })
    .catch((err) => {
      content.element.innerHTML = `
        <div class="error-output">
          Markdown rendering error: ${err.message}
        </div>
      `;
    });

  const wrap = div(
    {
      class: "markdown-rendered-cell markdown-body",
    },
    content
  );

  wrap.onClick(() => actions.editMarkdown());

  return wrap.element;
}