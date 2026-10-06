import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js";

export const createEntry = (method, args) => ({
  id: 0,
  method,
  args,
  depth: 0,
  count: van.state(1),
  time: new Date()
});