export class NotebookStore {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, payload) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        cb(payload);
      }
    }
  }

  set(key, value) {
    this.state[key] = value;
    this.emit(`change:${key}`, value);
    this.emit('change', this.state);
  }

  get(key) {
    return this.state[key];
  }
}