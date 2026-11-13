import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultData, saveData } from '../natverk/js/storage.js';
import '../natverk/js/localStorageShim.js';

test('saveData guards storage errors and does not throw', () => {
  const original = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('quota exceeded'); };
  try{
    const res = saveData(defaultData());
    assert.equal(res.ok, false);
    assert.match(res.error, /quota/i);
  } finally {
    globalThis.localStorage.setItem = original;
  }
});
