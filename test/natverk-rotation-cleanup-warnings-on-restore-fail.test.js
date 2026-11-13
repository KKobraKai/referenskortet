import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('rotation failure returns rollback_failed and keeps cleanup_warnings from tmp cleanup', () => {
  // Seed primary and archives
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"B"}');
  // Ensure original prev2 is absent so restore path uses removeItem (which we will fail)
  globalThis.localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  const origRem = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  let wrotePrev2 = false;
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.dataPrev2) wrotePrev2 = true;
    return origSet(k, v);
  };
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrev2 && wrotePrev2) { wrotePrev2 = false; throw new Error('rb-throw'); }
    return origGet(k);
  };
  // Make restoreAll for prev2 fail and tmp cleanup removal fail
  globalThis.localStorage.removeItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrev2) throw new Error('deny-restore');
    if (k === CONFIG.storageKeys.dataPrevTmp) throw new Error('deny-remove');
    return origRem(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rollback_failed');
    const s = JSON.stringify(res.cleanup_warnings || []);
    assert.match(s, new RegExp(CONFIG.storageKeys.dataPrevTmp));
  } finally {
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.getItem = origGet;
    globalThis.localStorage.removeItem = origRem;
  }
});

