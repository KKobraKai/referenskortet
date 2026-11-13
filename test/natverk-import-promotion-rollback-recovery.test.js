import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('2(a) rollback restores original recovery when promotion fails', () => {
  const original = defaultData(); original.company.name = 'Orig';
  const origBytes = JSON.stringify(original);
  const recovery = '{"schemaVersion":1,"bad":true}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, recovery);
  const next = defaultData(); next.company.name = 'After';
  // Cause promotion failure by throwing on removing recovery
  const origRemove = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  globalThis.localStorage.removeItem = (k) => {
    if (k === CONFIG.storageKeys.recovery) throw new Error('cannot remove recovery');
    return origRemove(k);
  };
  try{
    const res = importJsonString(JSON.stringify(next));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'promotion_failed');
    // Original recovery must remain intact
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), recovery);
    // Primary must be unchanged
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), origBytes);
  } finally {
    globalThis.localStorage.removeItem = origRemove;
  }
});

test('2(a) rollback failure returns rollback_failed', () => {
  const original = defaultData(); original.company.name = 'Orig';
  const origBytes = JSON.stringify(original);
  const recovery = '{"schemaVersion":1,"bad":true}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, recovery);
  const next = defaultData(); next.company.name = 'After';
  // Fail promotion by throwing on remove(recovery), and also fail rollback by throwing on setItem(recovery)
  const origRemove = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.removeItem = (k) => {
    if (k === CONFIG.storageKeys.recovery) throw new Error('cannot remove recovery');
    return origRemove(k);
  };
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.recovery) throw new Error('rollback set recovery failed');
    return origSet(k, v);
  };
  try{
    const res = importJsonString(JSON.stringify(next));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rollback_failed');
  } finally {
    globalThis.localStorage.removeItem = origRemove;
    globalThis.localStorage.setItem = origSet;
  }
});

