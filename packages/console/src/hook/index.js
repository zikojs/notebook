export const METHODS = ["log","info","debug","warn","error","table","dir","assert","count","countReset",
  "time","timeEnd","timeLog","group","groupCollapsed","groupEnd","clear"]

export function Hook(target, cb) {
  const orig = {}, counts = {}, timers = {}
  const emit = (method, args) => { try { cb({method, args}) } catch {} }
  const ms = l => (performance.now() - timers[l]).toFixed(2) + "ms"
  const impl = {
    count: (l = "default") => emit("log", [`${l}: ${counts[l] = (counts[l] || 0) + 1}`]),
    countReset: (l = "default") => { counts[l] = 0 },
    time: (l = "default") => { timers[l] = performance.now() },
    timeEnd: (l = "default") => { if (l in timers) { emit("log", [`${l}: ${ms(l)}`]); delete timers[l] } },
    timeLog: (l = "default", ...r) => { if (l in timers) emit("log", [`${l}: ${ms(l)}`, ...r]) },
    assert: (c, ...r) => { if (!c) emit("error", ["Assertion failed:", ...r]) },
  }
  METHODS.forEach(m => {
    orig[m] = target[m]
    target[m] = (...a) => { orig[m]?.apply(target, a); (impl[m] || ((...x) => emit(m, x)))(...a) }
  })
  const onErr = e => emit("error", [e.error || e.message])
  const onRej = e => emit("error", [e.reason instanceof Error ? e.reason : new Error("Unhandled rejection: " + safe(e.reason))])
  addEventListener("error", onErr)
  addEventListener("unhandledrejection", onRej)
  return () => {
    METHODS.forEach(m => target[m] = orig[m])
    removeEventListener("error", onErr)
    removeEventListener("unhandledrejection", onRej)
  }
}