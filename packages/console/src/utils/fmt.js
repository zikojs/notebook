/* printf-style substitutions: %s %d %i %f %o %O %j %c %% */
export function fmt(args) {
  const [f, ...rest] = args
  if (typeof f !== "string" || !rest.length || !/%[sdifoOjc%]/.test(f)) return args
  const s = f.replace(/%([sdifoOjc%])/g, (m, c) => {
    if (c === "%") return "%"
    if (!rest.length) return m
    const a = rest.shift()
    switch (c) {
      case "s": return isObj(a) ? short(a) : String(a)
      case "d": return String(Number(a))
      case "i": return String(parseInt(a))
      case "f": return String(parseFloat(a))
      case "c": return ""
      case "j": try { return JSON.stringify(a) } catch { return "[Circular]" }
      default: return isObj(a) ? preview(a) : prim(a)
    }
  })
  return [s, ...rest]
}