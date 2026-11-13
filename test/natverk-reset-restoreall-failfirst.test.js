import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { exportAndClearRecovery } from '../natverk/js/exportImport.js';
import { parseHTML } from 'linkedom';

// Fail-first for eaec2677: reset rollback restores prev and prev-2 in one try{}; a failure restoring prev skips prev-2.
test('reset rollback uses restoreAll with order and continues after a failure', () => {
  // Minimal DOM with confirm=true
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  window.confirm = ()=> true;
  Object.assign(globalThis, { window, document, Blob });
  // Seed corrupt primary + recovery, and archives
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"OK"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"OK"}');
  // Force saveData(defaults) to fail (simulate storage quota on primary write) and prev restore to fail
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const order = [];
  let inRollback = false;
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.data) { inRollback = true; throw new Error('quota'); }
    if (inRollback && k === CONFIG.storageKeys.dataPrev) { order.push(`set:${k}`); throw new Error('deny-prev-restore'); }
    if (inRollback && k === CONFIG.storageKeys.dataPrev2) order.push(`set:${k}`);
    return origSet(k, v);
  };
  try{
    const res = exportAndClearRecovery();
    // With restoreAll: expect rollback_failed and not the underlying save error
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rollback_failed');
    // prev2 should have been restored despite prev failing
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), '{"prev2":"OK"}');
    // Ensure attempts recorded include prev then prev2
    assert.deepEqual(order, [`set:${CONFIG.storageKeys.dataPrev}`, `set:${CONFIG.storageKeys.dataPrev2}`]);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

