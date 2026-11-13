import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('cleanup_warnings records tmp cleanup failure on dataPrevTmp remove', () => {
  // Seed primary A
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  // Force stage mismatch read-back to trigger tmp cleanup
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origRem = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => origSet(k, v);
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrevTmp) return 'DIFFERS';
    return origGet(k);
  };
  globalThis.localStorage.removeItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrevTmp) throw new Error('deny-remove');
    return origRem(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'primary_archive_failed');
    const s = JSON.stringify(res.cleanup_warnings || []);
    assert.match(s, new RegExp(CONFIG.storageKeys.dataPrevTmp));
    assert.match(s, /deny-remove|error/i);
  } finally {
    globalThis.localStorage.getItem = origGet;
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.removeItem = origRem;
  }
});

