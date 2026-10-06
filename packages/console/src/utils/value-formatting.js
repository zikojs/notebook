export const isObj = v => v !== null && typeof v === "object"
export const cname = v => { try { return Object.getPrototypeOf(v)?.constructor?.name || "" } catch { return "" } }
export const prim = v => typeof v === "string" ? JSON.stringify(v) : typeof v === "bigint" ? v + "n" : String(v)
export const primCls = v => v == null ? "nul" : typeof v === "string" ? "str" : typeof v === "boolean" ? "bool" : "num"
export const nodeLabel = n => n.nodeType === 1
  ? `<${n.localName}${n.id ? "#" + n.id : ""}${n.classList.length ? "." + [...n.classList].join(".") : ""}>` : String(n)

export const label = v =>
  Array.isArray(v) ? `Array(${v.length})` :
  v instanceof Map ? `Map(${v.size})` :
  v instanceof Set ? `Set(${v.size})` :
  (n => n && n !== "Object" ? n : "")(cname(v))

export const short = v =>
  typeof v === "function" ? `ƒ ${v.name || ""}()` :
  !isObj(v) ? prim(v) :
  v instanceof Date ? v.toISOString() :
  v instanceof RegExp ? String(v) :
  Array.isArray(v) ? label(v) : (label(v) || "Object") + " {…}"

export const entriesOf = v => {
  try {
    return Array.isArray(v) ? v.map((x, i) => [i, x])
      : v instanceof Map ? [...v].map(([a, b]) => [short(a), b])
      : v instanceof Set ? [...v].map((x, i) => [i, x])
      : Object.keys(v).map(k => [k, v[k]])
  } catch { return [] }
}

export const preview = v => {
  const es = entriesOf(v), list = Array.isArray(v) || v instanceof Set
  const body = es.slice(0, 5).map(([k, x]) => (list ? "" : k + ": ") + short(x)).join(", ") + (es.length > 5 ? ", …" : "")
  const l = label(v)
  return (l ? l + " " : "") + (list ? `[${body}]` : `{${body}}`)
}

export const safe = a => a instanceof Error ? a.message : isObj(a) ? preview(a) : typeof a === "function" ? short(a) : String(a)
