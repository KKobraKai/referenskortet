import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('2(a) Import promotion failure returns coded error and leaves storage unchanged', () => {
  // Seed existing primary and recovery
  const original = defaultData(); original.company.name = 'Before';
  const origBytes = JSON.stringify(original);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  const corrupt = '{"schemaVersion":1,"bad":true}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  // Prepare valid payload to import
  const next = defaultData(); next.company.name = 'After';
  const payload = JSON.stringify(next);
  // Monkey-patch removeItem to fail only when clearing recovery (promotion step)
  const origRemove = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  globalThis.localStorage.removeItem = (k) => {
    if (k === CONFIG.storageKeys.recovery) throw new Error('promotion failed');
    return origRemove(k);
  };
  try{
    const res = importJsonString(payload);
    assert.equal(res.ok, false, 'import must be not ok on promotion failure');
    assert.equal(res.code, 'promotion_failed', 'must return coded promotion_failed');
    // Assert storage unchanged
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), origBytes, 'primary must be unchanged');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), corrupt, 'recovery must remain intact');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), null, 'recoveryPrev must not be created');
  } finally {
    globalThis.localStorage.removeItem = origRemove;
  }
});

