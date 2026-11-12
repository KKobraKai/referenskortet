import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('N1 import: reading recovery fails => fail closed with no changes', () => {
  // Seed a recovery value and a distinct primary
  const corrupt = '{"schemaVersion":1,"bad":true}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  const original = defaultData(); original.company.name = 'Before';
  const origBytes = JSON.stringify(original);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  // Prepare valid payload
  const next = defaultData(); next.company.name = 'After';
  const payload = JSON.stringify(next);
  // Monkey-patch getItem to throw only when reading recovery
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.recovery) throw new Error('read denied');
    return origGet(k);
  };
  try{
    const res = importJsonString(payload);
    assert.equal(res.ok, false, 'import must be not ok when reading recovery fails');
    assert.equal(res.code, 'archive_failed', 'must return archive_failed when recovery cannot be read/archived');
    // Verify nothing changed
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), origBytes, 'primary must remain intact');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), null, 'recoveryPrev must not be created');
  } finally {
    globalThis.localStorage.getItem = origGet;
  }
});

