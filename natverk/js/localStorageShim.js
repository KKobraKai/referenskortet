// Minimal localStorage shim for Node tests (no persistence between processes).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key){ return store.has(key) ? store.get(key) : null; },
    setItem(key, value){ store.set(String(key), String(value)); },
    removeItem(key){ store.delete(key); },
    clear(){ store.clear(); },
    key(i){ return Array.from(store.keys())[i] ?? null; },
    get length(){ return store.size; }
  };
}
