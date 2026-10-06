import './index.css'
import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js"
const {div, span, input, button} = van.tags

import {
    fmt,
    isObj,
    safe,           // was used below but never imported: make sure utils/index.js exports it
} from './utils/index.js'

import {
    Hook,
} from './hook/index.js'

import {
    Inspect,
    Table
} from './components/index.js'


function createFeed(max = 1000) {
  const logs = van.state([])
  let depth = 0, id = 0
  const same = (a, b) => a.method === b.method && a.depth === b.depth && a.args.length === b.args.length &&
    a.args.every((x, i) => !isObj(x) && Object.is(x, b.args[i]))

  // `src` is either a raw {method, args} (from Hook / repl) or a ready-made entry (from Console.*)
  const push = src => {
    const {method, args = []} = src
    if (method === "clear") { depth = 0; logs.val = []; return }
    if (method === "groupEnd") { depth = Math.max(0, depth - 1); return }
    const isGroup = method === "group" || method === "groupCollapsed"
    const e = src.count
      ? Object.assign(src, {id: ++id, depth})
      : {id: ++id, method: isGroup ? "group" : method, args, depth, count: van.state(1), time: new Date()}
    if (src.count) cache.get(e)?.style.setProperty("--d", depth)   // re-indent a prebuilt row
    const last = logs.val.at(-1)
    if (last && !isGroup && same(last, e)) { last.count.val++; return }   // collapse repeats
    logs.val = [...logs.val, e].slice(-max)
    if (isGroup) depth++
  }
  return {logs, push, clear: () => push({method: "clear"})}
}

/* ---------- rows ---------- */
const LEVEL = {log: "log", dir: "log", table: "log", group: "log", info: "info", debug: "debug", warn: "warn", error: "error"}
const LEVELS = ["log", "info", "warn", "error", "debug"]
const cache = new WeakMap()   // keeps each row's DOM (and its expanded state) across re-renders

const buildRow = e => {
  const [a0, ...rest] = e.args
  const items = e.method === "table" && isObj(a0)
    ? [Table(a0), ...rest.map(x => Inspect(x, undefined, [], true)).element]
    : fmt(e.args).map(a => Inspect(a, undefined, [], true).element)
  return div({class: `cf-row ${e.method}`, style: `--d:${e.depth}`},
    () => e.count.val > 1 ? span({class: "cf-badge"}, e.count.val) : "",
    span({class: "cf-time"}, e.time.toLocaleTimeString([], {hour12: false})),
    div({class: "cf-msg"}, items))
}
const Row = e => cache.get(e) || (n => (cache.set(e, n), n))(buildRow(e))

/* ---------- Console.* : declarative entries ----------
   Each call returns a DOM node that works on its own (append it anywhere)
   and can also be passed as a child of ConsoleFeed(...).                    */
const nodeEntry = new WeakMap()   // node -> entry, so ConsoleFeed can read what a child represents

const makeEntry = (method, args) => ({id: 0, method, args, depth: 0, count: van.state(1), time: new Date()})

const entryNode = method => (...args) => {
  const e = makeEntry(method, args)
  const node = div({class: () => "cf cf-solo " + Console.theme.val}, Row(e))
  nodeEntry.set(node, e)
  return node
}

const Console = {
  theme: van.state("dark"),   // theme for standalone rows; reassign with Console.theme = yourState
  log: entryNode("log"),
  info: entryNode("info"),
  debug: entryNode("debug"),
  warn: entryNode("warn"),
  error: entryNode("error"),
  table: entryNode("table"),
  group: entryNode("group"),
  groupEnd: () => {
    const node = document.createComment("groupEnd")
    nodeEntry.set(node, {method: "groupEnd", args: []})
    return node
  },
}

/* ---------- ConsoleFeed component ----------
   ConsoleFeed({variant, repl, feed, hook}, ...children)   props first (optional)
   ConsoleFeed(...children)                                children only
   children = Console.log(...), Console.info(...), ...                          */
const isProps = a => a && typeof a === "object" && !(a instanceof Node) && Object.getPrototypeOf(a) === Object.prototype

function ConsoleFeed(...args) {
  const [props, ...kids] = isProps(args[0]) ? args : [{}, ...args]
  const {feed = createFeed(), variant = "dark", repl = true, hook = false} = props

  if (hook) Hook(console, feed.push)
  kids.flat(Infinity).forEach(c => { const e = nodeEntry.get(c); if (e) feed.push(e) })

  const theme = typeof variant === "string" ? van.state(variant) : variant
  const lv = Object.fromEntries(LEVELS.map(l => [l, van.state(true)]))
  const q = van.state("")
  const count = l => van.derive(() => feed.logs.val.filter(e => LEVEL[e.method] === l).length)

  const visible = van.derive(() => {
    const on = Object.fromEntries(LEVELS.map(l => [l, lv[l].val]))
    const s = q.val.toLowerCase()
    return feed.logs.val.filter(e =>
      (!(e.method in LEVEL) || on[LEVEL[e.method]]) &&
      (!s || fmt(e.args).map(safe).join(" ").toLowerCase().includes(s)))
  })

  let stick = true
  const body = div({class: "cf-body", onscroll: () => { stick = body.scrollHeight - body.scrollTop - body.clientHeight < 24 }},
    () => visible.val.length
      ? div(visible.val.map(e => Row(e)))
      : div({class: "cf-empty"}, "No messages yet. Anything sent to console.* shows up here."))
  van.derive(() => { visible.val; requestAnimationFrame(() => { if (stick) body.scrollTop = body.scrollHeight }) })

  const bar = div({class: "cf-bar"},
    LEVELS.map(l => button({
      class: () => `cf-chip ${l}` + (lv[l].val ? " on" : ""),
      "aria-pressed": () => lv[l].val,
      onclick: () => lv[l].val = !lv[l].val
    }, l, " ", count(l))),
    input({type: "search", placeholder: "Filter messages", "aria-label": "Filter messages", oninput: e => q.val = e.target.value}),
    button({onclick: feed.clear}, "Clear"))

  const hist = []; let hi = 0
  const run = code => {
    feed.push({method: "command", args: [code]})
    try { feed.push({method: "result", args: [(0, eval)(code)]}) }
    catch (err) { feed.push({method: "error", args: [err]}) }
  }
  const prompt = repl && div({class: "cf-prompt"}, span("\u203A"),
    input({placeholder: "Run JavaScript", "aria-label": "Run JavaScript", spellcheck: false, autocomplete: "off",
      onkeydown: e => {
        const el = e.target
        if (e.key === "Enter" && el.value.trim()) { hist.push(el.value); hi = hist.length; run(el.value); el.value = "" }
        else if (e.key === "ArrowUp" && hi > 0) { el.value = hist[--hi]; e.preventDefault() }
        else if (e.key === "ArrowDown") { el.value = hi < hist.length - 1 ? hist[++hi] : (hi = hist.length, "") }
      }}))

  return div({class: () => "cf " + theme.val, style: "flex:1"}, bar, body, prompt || "")
}

Object.assign(window, {ConsoleFeed: {Hook, createFeed, ConsoleFeed, Console}})

/* =====================================================================
   Demo
   ===================================================================== */
const theme = van.state("light")
Console.theme = theme

// 1) Declarative: children only, or props first then children
// document.body.append(
//   ConsoleFeed({variant: theme, repl: false},
//     Console.log("Hello from VanJS", 42, true, null, undefined),
//     Console.info("Server listening on :3000"),
//     Console.group("Request"),
//     Console.log("parsing"),
//     Console.warn("token expires soon"),
//     Console.groupEnd(),
//     Console.error(new Error("Something broke")),
//     Console.table([{id: 1, name: "Ada"}, {id: 2, name: "Linus"}]),
//   )
// )

// 2) Standalone: a single row, no toolbar
document.body.append(Console.log("Just one line", {a: 1, b : 1}))
document.body.append(Console.warn("Standalone warning"))
document.body.append(Console.table([1,2,3]))


// 3) Live: hook the real console into a feed
// const feed = createFeed()
// Hook(console, e => feed.push(e))          // or ConsoleFeed({hook: true, ...})
// globalThis.c = ConsoleFeed({feed, variant: theme})
// document.body.append(c)

// console.log("Hello from VanJS", 42, true, null, undefined)
// console.log({a: 1})
// console.group("Request")
// console.log("parsing")
// console.group("Auth")
// console.warn("token expires soon")
// console.groupEnd()
