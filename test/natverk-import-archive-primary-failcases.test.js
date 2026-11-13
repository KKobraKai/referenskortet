import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('N5 import: corrupt primary with no recovery — primary bytes are archived before replace', () => {
  // Corrupt primary, no recovery
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.removeItem(CONFIG.storageKeys.recovery);
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev:tmp');
  // Prepare valid payload
  const next = defaultData(); next.company.name = 'After';
  const res = importJsonString(JSON.stringify(next));
  assert.equal(res.ok, true);
  // Archive must contain exact original bytes
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), corrupt);
  // Primary must be replaced
  assert.notEqual(globalThis.localStorage.getItem(CONFIG.storageKeys.data), corrupt);
});

test('N5 import: schema-invalid primary with no recovery — archive required and then replace', () => {
  // Parseable but schema-invalid: areas wrong size
  const invalid = '{"schemaVersion":1,"company":{"name":"X","desc":"Y"},"current":{"areas":[],"partners":[]},"wanted":{"areas":[],"partners":[]},"weekly":{"usedAreaIndexes":[],"history":[]},"oneToOnes":[]}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, invalid);
  globalThis.localStorage.removeItem(CONFIG.storageKeys.recovery);
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev:tmp');
  const next = defaultData(); next.company.name = 'After';
  const res = importJsonString(JSON.stringify(next));
  assert.equal(res.ok, true);
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), invalid);
  assert.notEqual(globalThis.localStorage.getItem(CONFIG.storageKeys.data), invalid);
});

test('N5 import: existing primary-archive differs — rotate to prev-2 and replace ok', () => {
  const original = defaultData(); original.company.name = 'Orig';
  const origBytes = JSON.stringify(original);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  globalThis.localStorage.removeItem(CONFIG.storageKeys.recovery);
  // Seed a mismatching previous archive that should be rotated to data-prev-2
  const mismatch = '{"mismatch":true}';
  globalThis.localStorage.setItem('natverk:data-prev', mismatch);
  const next = defaultData(); next.company.name = 'After';
  const res = importJsonString(JSON.stringify(next));
  assert.equal(res.ok, true);
  // Rotation: data-prev holds the primary before replace, data-prev-2 holds the old archive
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), origBytes);
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev-2'), mismatch);
});

test('N5 import: quota failure archiving primary — fail closed and do nothing', () => {
  // Ensure no prior archive present
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev:tmp');
  const original = defaultData(); original.company.name = 'Orig';
  const origBytes = JSON.stringify(original);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  globalThis.localStorage.removeItem(CONFIG.storageKeys.recovery);
  const next = defaultData(); next.company.name = 'After';
  // Throw when writing dataPrevTmp
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => {
    if (k === 'natverk:data-prev:tmp') throw new Error('quota');
    return origSet(k, v);
  };
  try{
    const res = importJsonString(JSON.stringify(next));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'primary_archive_failed');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), origBytes);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

