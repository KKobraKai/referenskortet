import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import { loadData, saveData } from '../natverk/js/storage.js';

test('corrupt stored data is preserved and save refuses while recovery exists', () => {
  const bad = '{"schemaVersion":1,"company":{"name":"X","desc":"Y"},"current":{"areas":[],"partners":[]},"wanted":{"areas":[],"partners":[]},"weekly":{"usedAreaIndexes":[],"history":[]},"oneToOnes":[]}';
  // Simulate raw invalid by wrong sizes (areas empty)
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, bad);
  const d = loadData(); // returns defaults, but should have backed up
  assert.ok(d && d.schemaVersion === 1);
  const raw = globalThis.localStorage.getItem(CONFIG.storageKeys.data);
  const rec = globalThis.localStorage.getItem(CONFIG.storageKeys.recovery);
  assert.equal(raw, bad);
  assert.equal(typeof rec, 'string');
  // Now saving should refuse
  const res = saveData(d);
  assert.equal(res.ok, false);
});
