// Minimal localStorage shim for Node tests (no persistence between processes),
// and guard against environments where accessing localStorage getter may throw.
(function(){
  let existing;
  try {
    existing = globalThis.localStorage;
  } catch (e) {
    existing = undefined;
  }
  if (typeof existing === 'undefined') {
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
