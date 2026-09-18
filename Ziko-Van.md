- Zikojs

```js
import { tags } from 'ziko/dom'
import { useState, useDerived } from 'ziko/hooks'
const { p } = tags
export default function Timer(){
    const MILLI_SECONDES = 700;
    const [timer, setTimer] = useState(0);
    const converToHMS = seconds => `${Math.floor(seconds / 3600)} : ${Math.floor((seconds % 3600) / 60)} : ${seconds % 60} `
    const time = useDerived(t => converToHMS(t) , [timer] )
    let i = 0;
    setInterval(
        () => setTimer(i++),
        MILLI_SECONDES
    )
    const ui = p('Elapsed Time : ', time)
    return ui
}
```

- Vanjs

```ts
import van from "vanjs-core";

const { tags, state, derive } = van;

export default function Timer() {
    const MILLI_SECONDS = 700;
    const timer = state(0);

    const convertToHMS = seconds =>
        `${Math.floor(seconds / 3600)} : ${Math.floor((seconds % 3600) / 60)} : ${seconds % 60}`;

    const time = derive(() => convertToHMS(timer.val));

    setInterval(() => timer.val++, MILLI_SECONDS);

    return tags.p("Elapsed Time : ", time);
}
```