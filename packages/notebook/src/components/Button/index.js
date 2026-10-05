import van from "vanjs-core";

export const Button = ({ class: className = "", title = "", disabled = false, onclick }, ...children) =>
  van.tags.button({ class: `btn ${className}`, title, disabled, onclick }, ...children);
