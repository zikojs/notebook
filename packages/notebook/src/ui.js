import van from "vanjs-core";

const { button } = van.tags;

export const Button = ({ class: className = "", title = "", disabled = false, onclick }, ...children) =>
  button({ class: `btn ${className}`, title, disabled, onclick }, ...children);