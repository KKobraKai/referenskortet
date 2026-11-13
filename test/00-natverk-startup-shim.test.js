import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import url from 'node:url';

test('startup guards localStorage getter throwing and i18n init does not crash', async () => {
  // Define a throwing getter for localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get(){ throw new Error('denied'); }
  });
  // Import shim then i18n — should not throw
  const shimPath = path.join(process.cwd(), 'natverk/js/localStorageShim.js');
  await import(url.pathToFileURL(shimPath).href + `?v=${Math.random()}`);
  const i18nPath = path.join(process.cwd(), 'natverk/js/i18n.js');
  await import(url.pathToFileURL(i18nPath).href + `?v=${Math.random()}`);
  // After shim, a stub should exist
  let ok = true;
  try { void globalThis.localStorage.length; } catch { ok = false; }
  assert.equal(ok, true);
});
