import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultData, saveData } from '../natverk/js/storage.js';
import '../natverk/js/localStorageShim.js';

test('saveData fails closed when getItem throws during corrupt check', () => {
  const orig = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  globalThis.localStorage.getItem = (k) => { if (k) throw new Error('denied'); return null; };
  try{
    const res = saveData(defaultData());
    assert.equal(res.ok, false);
    assert.equal(res.code, 'storage_get_failed');
  } finally {
    globalThis.localStorage.getItem = orig;
  }
});

