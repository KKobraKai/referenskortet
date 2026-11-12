import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('N5 import: primary read throws => fail closed with coded error', () => {
  // Seed a primary value but make getItem throw on read
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.data) throw new Error('denied');
    return origGet(k);
  };
  try{
    const next = defaultData(); next.company.name = 'B';
    const res = importJsonString(JSON.stringify(next));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'primary_read_failed');
    // Primary unchanged
    globalThis.localStorage.getItem = origGet;
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
  } finally {
    globalThis.localStorage.getItem = origGet;
  }
});

