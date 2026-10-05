import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";


import { tags } from 'ziko/dom'

const { div } = tags

export function MarkdownView({ cellData, actions }) {
  const content = div();
  
  // Process Markdown asynchronously using Remark + Rehype
  remark()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify)
    .process(cellData.code || "*Empty Markdown Cell*")
    .then((file) => {
      content.element.innerHTML = String(file);
    })
    .catch((err) => {
      content.element.innerHTML = `<div class="error-output">Markdown rendering error: ${err.message}</div>`;
    });
  
  const wrap = div({ class: "markdown-rendered-cell markdown-body" }, content);
  wrap.onClick(() => actions.editMarkdown())
  return wrap.element;
}