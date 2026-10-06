const actions = [
  ["Messages", [
    ["log", () => console.log("Hello from VanJS", 42, true, null, undefined)],
    ["info", () => console.info("Server listening on :3000")],
    ["debug", () => console.debug("cache miss", {key: "user:12"})],
    ["warn", () => console.warn("Deprecated: use render() instead")],
    ["error", () => console.error(new Error("Something broke"))],
    ["%s format", () => console.log("%s has %d items %c(styled)", "Cart", 3, "color:red")],
    ["Repeat x5", () => { for (let i = 0; i < 5; i++) console.log("tick") }],
  ]],
  ["Inspect", [
    ["Nested object", () => {
      const o = {user: {name: "Zakaria", tags: ["js", "three", "van"]}, ids: new Set([1, 2]),
        lookup: new Map([["a", 1], ["b", {deep: true}]]), when: new Date(), run() {}, empty: {}}
      o.self = o
      console.log("Click to expand", o)
    }],
    ["DOM node", () => console.log(document.body, document.getElementById("mount"))],
    ["Table", () => console.table([{id: 1, name: "Ada", role: "dev"}, {id: 2, name: "Linus", role: "ops", team: "kernel"}])],
  ]],
  ["Timing and flow", [
    ["Group", () => { console.group("Request"); console.log("parsing"); console.group("Auth"); console.warn("token expires soon"); console.groupEnd(); console.groupEnd() }],
    ["Timer", () => { console.time("work"); setTimeout(() => console.timeEnd("work"), 350) }],
    ["Count", () => console.count("clicks")],
    ["Assert", () => console.assert(1 === 2, "math is hard")],
    ["Rejection", () => Promise.reject(new Error("Unhandled promise"))],
    ["Throw", () => setTimeout(() => { throw new TypeError("Uncaught from timeout") })],
  ]],
]