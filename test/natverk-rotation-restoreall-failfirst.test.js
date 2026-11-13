import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

// This test is a fail-first for eaec2677: on rotation failure, prev-2 restore errors are swallowed,
// returning rotation_failed and silently losing the original prev-2 bytes.
test('rotation restoreAll: prev-2 restore failure reports rollback_failed and attempts independent restores', () => {
  // primary=A, prev=B, prev2=C
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"B":1}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"C":2}');
  // After rotation, code writes prev2=B and then its read-back throws; then restore prev2 back to C throws
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  const origRem = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  let justWrotePrev2 = false;
  let afterReadBackThrow = false;
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.dataPrev2) {
      if (afterReadBackThrow) throw new Error('deny-restore');
      justWrotePrev2 = true;
    }
    return origSet(k, v);
  };
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrev2 && justWrotePrev2) { justWrotePrev2 = false; afterReadBackThrow = true; throw new Error('rb-throw'); }
    return origGet(k);
  };
  // Keep removeItem normal; failure is injected via setItem after read-back throw
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    // With restoreAll helper: expect rollback_failed and slots mentioning data-prev-2
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rollback_failed');
    const s = JSON.stringify(res.slots || []);
    assert.match(s, /data[-_]prev[-_]2|older/i);
  } finally {
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.getItem = origGet;
    globalThis.localStorage.removeItem = origRem;
  }
});

