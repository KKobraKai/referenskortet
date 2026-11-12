// Minimal localStorage shim for Node tests (no persistence between processes),
// and guard against environments where accessing localStorage getter may throw.
(function(){
  let existing;
  try {
    existing = globalThis.localStorage;
  } catch (e) {
    existing = undefined;
  }
  // Only install a stub in Node test environments, never in browsers.
  const isNode = typeof process !== 'undefined' && process && process.versions && !!process.versions.node;
  if (typeof existing === 'undefined' && isNode) {
    const store = new Map();
    const stub = {
      getItem(key){ return store.has(key) ? store.get(key) : null; },
      setItem(key, value){ store.set(String(key), String(value)); },
      removeItem(key){ store.delete(key); },
      clear(){ store.clear(); },
      key(i){ return Array.from(store.keys())[i] ?? null; },
      get length(){ return store.size; }
    };
    try{
      Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
    }catch{
      try { globalThis.localStorage = stub; } catch {}
    }
  }
})();
