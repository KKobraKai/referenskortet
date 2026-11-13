import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import '../natverk/js/localStorageShim.js';
import { CONFIG } from '../natverk/js/config.js';
import { loadData } from '../natverk/js/storage.js';
import { exportAndClearRecovery } from '../natverk/js/exportImport.js';

test('reset_cancelled carries ui_confirm cleanup_warnings when confirm throws', () => {
  // Seed corrupt primary and recovery
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  Object.assign(globalThis, { window, document, Blob });
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  window.confirm = ()=>{ throw new Error('blocked'); };
  // Direct call to exportAndClearRecovery to assert cleanup_warnings presence
  const res = exportAndClearRecovery();
  assert.equal(res.ok, false);
  assert.equal(res.code, 'reset_cancelled');
  const s = JSON.stringify(res.cleanup_warnings || []);
  assert.match(s, /ui_confirm/);
  const re = loadData();
  assert.ok(re && typeof re === 'object');
});

