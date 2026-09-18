import van from "vanjs-core";
import { createIcons, icons } from "lucide";

const { button, i } = van.tags;

export const Icon = ({ name }) => {
  const iconEl = i({ "data-lucide": name, class: "icon" });
  // `targets` narrows the scan to just this element instead of the whole
  // document — matches the behaviour of the old CDN build. If your
  // installed `lucide` version doesn't support it, drop the option and
  // call createIcons({ icons }) once globally after mount instead.
  setTimeout(() => createIcons({ icons, targets: [iconEl] }), 0);
  return iconEl;
};

export const Button = ({ class: className = "", title = "", disabled = false, onclick, children = [] }) =>
  button({ class: `btn ${className}`, title, disabled, onclick }, ...children);