# Migrating from VanJS to ZikoJS

ZikoJS and VanJS share a similar philosophy: build user interfaces directly with the DOM, keep the runtime lightweight, and avoid a Virtual DOM.

If you already have a VanJS application, migrating to ZikoJS does not require rewriting your application architecture. Most of the migration consists of replacing VanJS APIs with their ZikoJS equivalents and adapting to ZikoJS's `UIElement` abstraction.

This guide covers the main differences and provides before-and-after examples.

---

## Installation

Remove `vanjs-core` and install `ziko`:

```bash
npm uninstall vanjs-core
npm install ziko
```

With pnpm:

```bash
pnpm remove vanjs-core
pnpm add ziko
```

---

# 1. Imports

VanJS exposes its APIs through the `van` object:

```js
import van from "vanjs-core";

const { tags, state, derive } = van;
```

ZikoJS separates APIs by module:

```js
import { tags } from "ziko/dom";
import { useState, useDerived } from "ziko/hooks";
```

The basic mapping is:

| VanJS        | ZikoJS                         |
| ------------ | ------------------------------ |
| `van.tags`   | `tags` from `ziko/dom`         |
| `van.state`  | `useState` from `ziko/hooks`   |
| `van.derive` | `useDerived` from `ziko/hooks` |

You can also import tags directly:

```js
import { div, p, button } from "ziko/dom";
```

This can be useful when you only need a small number of tags.

---

# 2. Tags

Both libraries provide dynamically accessible tag functions.

### VanJS

```js
const { tags } = van;

const element = tags.div(
    tags.p("Hello"),
    tags.button("Click me")
);
```

### ZikoJS

```js
import { tags } from "ziko/dom";

const { div, p, button } = tags;

const element = div(
    p("Hello"),
    button("Click me")
);
```

ZikoJS's `tags` object provides dynamic tag functions, so you can use HTML, SVG, and custom element names without maintaining a list of tag names.

```js
tags.div();
tags.section();
tags.svg();
tags.my-custom-element();
```

---

# 3. Important: ZikoJS tags return `UIElement`

This is one of the most important differences when migrating from VanJS.

VanJS tag functions return native DOM elements:

```js
const element = tags.div("Hello");

element instanceof HTMLElement;
// true
```

ZikoJS tag functions return a `UIElement`:

```js
const ui = tags.div("Hello");

ui instanceof UIElement;
// true
```

The underlying native DOM element is available through `.element`:

```js
const ui = tags.div("Hello");

ui.element instanceof HTMLElement;
// true
```

Conceptually:

```text
VanJS

tags.div(...)
    ↓
HTMLElement


ZikoJS

tags.div(...)
    ↓
UIElement
    ↓
.element
    ↓
HTMLElement
```

This distinction is important when migrating code that directly uses browser DOM APIs.

---

# 4. Accessing the native DOM element

VanJS:

```js
const element = tags.div("Hello");

element.classList.add("active");
element.addEventListener("click", handler);
```

ZikoJS:

```js
const ui = tags.div("Hello");

ui.element.classList.add("active");
ui.element.addEventListener("click", handler);
```

The rule is simple:

> If you need a native DOM API, use `.element`.

For example:

```js
const ui = tags.div();

ui.element.focus();
ui.element.classList.add("active");
ui.element.getBoundingClientRect();
```

---

# 5. Use ZikoJS methods when possible

You do not always need to access `.element`.

ZikoJS provides methods on `UIElement` for common operations.

For example:

```js
const box = tags.div("Hello");

box.style({
    color: "red",
    padding: "10px"
});
```

And:

```js
box.mount(document.body);
```

This gives two levels of access:

```text
UIElement API
    ↓
.mount()
.style()
...

Native DOM API
    ↓
.element
```

You can therefore keep using the ZikoJS abstraction or drop down to the native DOM whenever necessary.

---

# 6. Mounting

VanJS commonly uses `van.add()`:

```js
van.add(
    document.body,
    App()
);
```

Because ZikoJS returns `UIElement`, it provides `.mount()`:

```js
App().mount(document.body);
```

You can also append the underlying DOM element yourself:

```js
document.body.append(
    App().element
);
```

However, `.mount()` is generally the more natural ZikoJS API.

Migration:

```diff
- van.add(document.body, App());
+ App().mount(document.body);
```

---

# 7. State

State is one of the main API differences.

VanJS uses a mutable state object:

```js
const count = van.state(0);

console.log(count.val);

count.val = 10;
count.val++;
```

ZikoJS uses a getter/setter pair:

```js
const [count, setCount] = useState(0);

console.log(count());

setCount(10);
```

The setter also accepts an updater function:

```js
setCount(old => old + 1);
```

The migration is therefore:

| VanJS               | ZikoJS                     |
| ------------------- | -------------------------- |
| `state(0)`          | `useState(0)`              |
| `state.val`         | `state()`                  |
| `state.val = value` | `setState(value)`          |
| `state.val++`       | `setState(old => old + 1)` |

---

# 8. Setting state

ZikoJS supports two forms of `setState`.

### Set a new value

```js
setCount(10);
```

### Derive a new value from the previous value

```js
setCount(old => old + 1);
```

This means a VanJS mutation such as:

```js
count.val++;
```

can be migrated to:

```js
setCount(old => old + 1);
```

For more complex state:

```js
const [user, setUser] = useState({
    name: "John",
    age: 20
});

setUser({
    name: "Jane",
    age: 21
});
```

Or:

```js
setUser(old => ({
    ...old,
    age: old.age + 1
}));
```

---

# 9. Reactive values in the DOM

VanJS:

```js
const count = van.state(0);

tags.p(
    "Count: ",
    () => count.val
);
```

ZikoJS:

```js
const [count] = useState(0);

p(
    "Count: ",
    count
);
```

A ZikoJS state getter can be passed directly as reactive content.

For example:

```js
const [count, setCount] = useState(0);

const ui = p(
    "Count: ",
    count
);

setCount(old => old + 1);
```

The UI updates when the state changes.

---

# 10. Derived state

VanJS provides `van.derive()`:

```js
const count = van.state(0);

const doubled = van.derive(
    () => count.val * 2
);
```

VanJS discovers the state dependency through the function.

ZikoJS uses `useDerived()`:

```js
const [count] = useState(0);

const [doubled] = useDerived(
    count => count * 2,
    [count]
);
```

The important difference is that ZikoJS explicitly provides the source states.

```js
useDerived(deriveFunction, sources);
```

For example:

```js
const [firstName] = useState("John");
const [lastName] = useState("Doe");

const [fullName] = useDerived(
    firstName => `${firstName} ${lastName()}`,
    [firstName, lastName]
);
```

---

# 11. `useDerived()` uses the same state interface

`useDerived()` returns the same state interface as `useState()`.

A normal state:

```js
const [count, setCount] = useState(0);
```

A derived state:

```js
const [doubled] = useDerived(
    count => count * 2,
    [count]
);
```

Both expose a getter:

```js
count();
doubled();
```

So ZikoJS has a consistent reactive-value model:

```text
useState()
    ↓
[state, setState]


useDerived()
    ↓
[state, setState]
```

The difference is that the value produced by `useDerived()` is controlled by its source states, so its setter is normally not used.

---

# 12. Multiple derived-state sources

VanJS:

```js
const first = van.state(10);
const second = van.state(20);

const total = van.derive(
    () => first.val + second.val
);
```

ZikoJS:

```js
const [first] = useState(10);
const [second] = useState(20);

const [total] = useDerived(
    (first, second) => first + second,
    [first, second]
);
```

The sources are explicitly declared:

```js
useDerived(
    (first, second) => first + second,
    [first, second]
);
```

---

# 13. Styling

VanJS commonly allows styles to be passed as raw CSS:

```js
tags.div({
    style: `
        color: red;
        background: black;
        padding: 10px;
    `
});
```

ZikoJS supports a JavaScript style object:

```js
div({
    style: {
        color: "red",
        background: "black",
        padding: "10px"
    }
});
```

You can also use the `.style()` method:

```js
div()
    .style({
        color: "red",
        background: "black",
        padding: "10px"
    });
```

Therefore:

| VanJS                    | ZikoJS                       |
| ------------------------ | ---------------------------- |
| Raw CSS string           | Style object                 |
| `style: "color: red"`    | `style: { color: "red" }`    |
| `style: "padding: 10px"` | `style: { padding: "10px" }` |
| —                        | `.style(object)`             |

---

# 14. Dynamic styles

ZikoJS styles can also be reactive.

```js
const [active] = useState(true);

div({
    style: () => ({
        color: active() ? "red" : "gray",
        opacity: active() ? 1 : 0.5
    })
});
```

This allows styles to be derived directly from state.

---

# 15. Events

Event handlers are similar between the two libraries.

VanJS:

```js
tags.button(
    {
        onclick: () => count.val++
    },
    "Increment"
);
```

ZikoJS:

```js
button(
    {
        onclick: () => setCount(old => old + 1)
    },
    "Increment"
);
```

The main difference is the state API rather than the event API.

You can also use native DOM events through `.element`:

```js
const ui = button("Click me");

ui.element.addEventListener(
    "click",
    handler
);
```

---

# 16. Components

The component structure can remain almost unchanged.

VanJS:

```js
function Counter() {
    const count = van.state(0);

    return van.tags.div(
        van.tags.p(() => count.val),
        van.tags.button(
            {
                onclick: () => count.val++
            },
            "Increment"
        )
    );
}
```

ZikoJS:

```js
function Counter() {
    const [count, setCount] = useState(0);

    return div(
        p(count),
        button(
            {
                onclick: () => setCount(old => old + 1)
            },
            "Increment"
        )
    );
}
```

The component still returns a UI object. The main difference is that ZikoJS returns a `UIElement` rather than a native DOM element.

---

# 17. Complete Timer migration

Here is a complete example showing the main differences.

## VanJS

```js
import van from "vanjs-core";

const { tags, state, derive } = van;

export default function Timer() {
    const MILLI_SECONDS = 700;

    const timer = state(0);

    const convertToHMS = seconds =>
        `${Math.floor(seconds / 3600)} : ${
            Math.floor((seconds % 3600) / 60)
        } : ${seconds % 60}`;

    const time = derive(
        () => convertToHMS(timer.val)
    );

    setInterval(
        () => timer.val++,
        MILLI_SECONDS
    );

    return tags.p(
        "Elapsed Time : ",
        time
    );
}
```

## ZikoJS

```js
import { tags } from "ziko/dom";
import { useState, useDerived } from "ziko/hooks";

const { p } = tags;

export default function Timer() {
    const MILLI_SECONDS = 700;

    const [timer, setTimer] = useState(0);

    const convertToHMS = seconds =>
        `${Math.floor(seconds / 3600)} : ${
            Math.floor((seconds % 3600) / 60)
        } : ${seconds % 60}`;

    const [time] = useDerived(
        timer => convertToHMS(timer),
        [timer]
    );

    setInterval(
        () => setTimer(old => old + 1),
        MILLI_SECONDS
    );

    return p(
        "Elapsed Time : ",
        time
    );
}
```

The application architecture remains essentially the same.

---

# 18. Quick API mapping

| VanJS                          | ZikoJS                       |
| ------------------------------ | ---------------------------- |
| `import van from "vanjs-core"` | `import ... from "ziko/..."` |
| `van.tags`                     | `tags`                       |
| `tags.div()`                   | `tags.div()`                 |
| `HTMLElement` returned by tag  | `UIElement` returned by tag  |
| —                              | `ui.element`                 |
| `van.add(parent, child)`       | `child.mount(parent)`        |
| `van.state(value)`             | `useState(value)`            |
| `state.val`                    | `state()`                    |
| `state.val = value`            | `setState(value)`            |
| `state.val++`                  | `setState(old => old + 1)`   |
| `van.derive(fn)`               | `useDerived(fn, sources)`    |
| `derived.val`                  | `derived()`                  |
| Raw CSS style string           | Style object                 |
| —                              | `.style(object)`             |
| Native DOM API directly        | `ui.element` + native API    |

---

# 19. Migration rules at a glance

When migrating a VanJS application, the following rules cover most cases:

### Imports

```diff
- import van from "vanjs-core";
+ import { tags } from "ziko/dom";
+ import { useState, useDerived } from "ziko/hooks";
```

### State

```diff
- const count = van.state(0);
+ const [count, setCount] = useState(0);
```

### Read state

```diff
- count.val
+ count()
```

### Set state

```diff
- count.val = 10;
+ setCount(10);
```

### Update state

```diff
- count.val++;
+ setCount(old => old + 1);
```

### Derived state

```diff
- const doubled = van.derive(() => count.val * 2);
+ const [doubled] = useDerived(
+     count => count * 2,
+     [count]
+ );
```

### Mount

```diff
- van.add(document.body, App());
+ App().mount(document.body);
```

### Native DOM access

```diff
- const element = tags.div();
- element.classList.add("active");
+ const ui = tags.div();
+ ui.element.classList.add("active");
```

### Styling

```diff
- tags.div({
-     style: "color: red; padding: 10px"
- });
+ tags.div({
+     style: {
+         color: "red",
+         padding: "10px"
+     }
+ });
```

Or:

```js
tags.div()
    .style({
        color: "red",
        padding: "10px"
    });
```

---

# 20. Migration strategy

For an existing application, migrate incrementally.

### Step 1 — Replace the dependency

```bash
npm remove vanjs-core
npm install ziko
```

### Step 2 — Migrate imports

Replace the `van` namespace with the appropriate ZikoJS modules.

### Step 3 — Migrate state

Convert:

```js
state(0)
```

to:

```js
useState(0)
```

Then replace:

```js
state.val
```

with:

```js
state()
```

and mutations with the corresponding setter.

### Step 4 — Migrate derived values

Convert:

```js
derive(...)
```

to:

```js
useDerived(..., sources)
```

### Step 5 — Adapt DOM element access

Remember that ZikoJS tags return `UIElement`:

```js
const ui = div();
```

If existing code expects a native DOM element:

```js
const element = ui.element;
```

### Step 6 — Migrate mounting

Replace:

```js
van.add(parent, child);
```

with:

```js
child.mount(parent);
```

### Step 7 — Migrate styles

Convert raw CSS strings into style objects where appropriate:

```js
{
    style: {
        color: "red",
        padding: "10px"
    }
}
```

### Step 8 — Adopt ZikoJS APIs

Once the application works, you can progressively adopt additional ZikoJS functionality such as components, hooks, routing, JSX, and other ecosystem packages.

---

# 21. The conceptual difference

The migration can be summarized in two layers.

VanJS works primarily with native DOM elements:

```text
VanJS
   │
   ├── tags
   │
   ├── state
   │
   └── derive
        │
        ▼
   DOM elements
```

ZikoJS adds a `UIElement` abstraction around the DOM:

```text
ZikoJS
   │
   ├── tags
   │      │
   │      ▼
   │   UIElement
   │      │
   │      └── .element → HTMLElement
   │
   ├── useState
   │
   └── useDerived
```

This means ZikoJS remains DOM-oriented while providing a higher-level object for composing, mounting, styling, and interacting with UI elements.

When you need to work at the native DOM level, `.element` gives you direct access to the underlying element.

---

# 22. In short

A typical VanJS application:

```js
const count = van.state(0);

const app = van.tags.div(
    van.tags.p(() => count.val),
    van.tags.button(
        {
            onclick: () => count.val++
        },
        "Increment"
    )
);

van.add(document.body, app);
```

becomes:

```js
const [count, setCount] = useState(0);

const app = tags.div(
    tags.p(count),
    tags.button(
        {
            onclick: () => setCount(old => old + 1)
        },
        "Increment"
    )
);

app.mount(document.body);
```

The core philosophy remains the same:

```text
Direct DOM
    +
Reactive state
    +
Composable functions
    +
No Virtual DOM
```

The main changes are the ZikoJS state interface and the `UIElement` abstraction around native DOM elements.
