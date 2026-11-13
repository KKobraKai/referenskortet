import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('recovery-prev not overwritten until save succeeds (promotion after save)', () => {
  // Existing prev should remain if save fails
  globalThis.localStorage.setItem(CONFIG.storageKeys.recoveryPrev, 'OLDPREV');
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, '{"schemaVersion":1,');
  const next = defaultData();
  next.company.name = 'X';
  // Force save failure by making setItem throw on data key
  const orig = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = (k,v) => {
    if (k === CONFIG.storageKeys.data) throw new Error('fail save');
    return orig(k,v);
  };
  try{
    const res = importJsonString(JSON.stringify(next));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'import_storage_failed');
    // Old prev must remain unchanged
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), 'OLDPREV');
  } finally {
    globalThis.localStorage.setItem = orig;
  }
});

