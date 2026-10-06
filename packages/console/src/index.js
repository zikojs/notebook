import './index.css'
import van from "https://cdn.jsdelivr.net/npm/vanjs-core@1.5.3/src/van.js"
import {
  ConsoleFeed,
  Console
} from './components'
import { createFeed } from './feed/createFeed'
import { Hook } from './hook/index.js'

Object.assign(window, {ConsoleFeed: {Hook, createFeed, ConsoleFeed, Console}})

/* =====================================================================
   Demo
   ===================================================================== */

const theme = van.state("light")

// 1) Declarative: children only, or props first then children
document.body.append(
  ConsoleFeed({variant: theme, repl: false},
    Console.log("Hello from VanJS", 42, true, null, undefined),
    Console.info("Server listening on :3000"),
    Console.group("Request"),
    Console.log("parsing"),
    Console.warn("token expires soon"),
    Console.groupEnd(),
    Console.error(new Error("Something broke")),
    Console.table([{id: 1, name: "Ada"}, {id: 2, name: "Linus"}]),
  )
)

// 2) Standalone: a single row, no toolbar
document.body.append(Console.log("Just one line", {a: 1, b : 1}))
document.body.append(Console.warn("Standalone warning"))
document.body.append(Console.table([1,2,3]))


// // 3) Live: hook the real console into a feed
// Console.theme = theme
// const feed = createFeed()
// Hook(console, e => feed.push(e))
// globalThis.c = ConsoleFeed({feed})
// document.body.append(c)

// console.log("Hello from VanJS", 42, true, null, undefined)
// console.log({a: 1})
// console.group("Request")
// console.log("parsing")
// console.group("Auth")
// console.warn("token expires soon")
// console.groupEnd()
