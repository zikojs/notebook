export const same = (a, b) =>
    a.method === b.method &&
    a.depth === b.depth &&
    a.args.length === b.args.length &&
    a.args.every((x, i) => !isObj(x) && Object.is(x, b.args[i])); // is v f