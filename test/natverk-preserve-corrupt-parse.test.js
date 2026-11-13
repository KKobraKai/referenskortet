import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import { loadData, saveData } from '../natverk/js/storage.js';
import '../natverk/js/localStorageShim.js';

test('parse-failure bytes are preserved via recovery and not overwritten by save', () => {
  const corrupt = '{"schemaVersion":1,'; // unparseable JSON
  // Place corrupt bytes
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  // Load should return defaults but back up corrupt bytes
  const d = loadData();
  assert.ok(d && d.schemaVersion === 1);
  // After load, the original bytes must still be intact in either primary or recovery
  const raw = globalThis.localStorage.getItem(CONFIG.storageKeys.data);
  const rec = globalThis.localStorage.getItem(CONFIG.storageKeys.recovery);
  assert.equal(raw, corrupt, 'primary key must remain untouched');
  assert.equal(rec, corrupt, 'recovery key must receive corrupt bytes');
  // Attempting a save must not overwrite the corrupt bytes
  const res = saveData(d);
  assert.equal(res.ok, false, 'save must refuse while recovery exists');
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), corrupt, 'primary must still hold corrupt bytes');
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), corrupt, 'recovery must still hold corrupt bytes');
});

