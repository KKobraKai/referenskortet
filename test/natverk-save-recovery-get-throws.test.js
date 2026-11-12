import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, saveData } from '../natverk/js/storage.js';

test('saveData: getItem(recovery) throws => refuse save and do not overwrite primary', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.recovery) throw new Error('denied');
    return origGet(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = saveData(B);
    assert.equal(res.ok, false);
    assert.equal(res.code, 'storage_get_failed');
    // Primary unchanged
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
  } finally {
    globalThis.localStorage.getItem = origGet;
  }
});

