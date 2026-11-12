import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { exportAndClearRecovery } from '../natverk/js/exportImport.js';
import { parseHTML } from 'linkedom';

// Fail-first for eaec2677: reset rollback restores prev and prev-2 in one try{}; a failure restoring prev skips prev-2.
test('reset rollback uses restoreAll and reports rollback_failed when a restore throws', () => {
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
  // Force saveData(defaults) to fail (simulate storage quota on primary write)
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.data) throw new Error('quota');
    if (k === CONFIG.storageKeys.dataPrev) throw new Error('deny-prev-restore');
    return origSet(k, v);
  };
  try{
    const res = exportAndClearRecovery();
    // With restoreAll: expect rollback_failed and not the underlying save error
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rollback_failed');
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

