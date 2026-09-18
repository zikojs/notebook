import van from "vanjs-core";
import { UIElement } from "ziko/dom"

const originalTags = van.tags

van.tags = new Proxy(originalTags, {
  get(target, tagName, receiver) {
    const originalTagFn = Reflect.get(target, tagName, receiver)
    return (...args) => {
      for(let i=0; i<args.length; i++) if(args[i] instanceof UIElement) args[i] = args[i].element
      const element = originalTagFn(...args)
      return element
    }
  }
});

export { van }