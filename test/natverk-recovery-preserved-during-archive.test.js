import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('N5 import: old recovery differs from primary — primary archived and recovery kept/rotated', () => {
  // Seed primary A and a differing recovery R
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  const Rbytes = '{"schemaVersion":1,"bad":true}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Rbytes);
  // Import B
  const B = defaultData(); B.company.name = 'B';
  const res = importJsonString(JSON.stringify(B));
  assert.equal(res.ok, true);
  // Primary archived
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), Abytes);
  // Recovery is kept or rotated to recoveryPrev
  const kept = globalThis.localStorage.getItem(CONFIG.storageKeys.recovery);
  const rotated = globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev);
  assert.ok(kept === Rbytes || rotated === Rbytes, 'recovery bytes must be preserved in recovery or recoveryPrev');
});

