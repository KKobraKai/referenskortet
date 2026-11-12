import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { exportAndClearRecovery } from '../natverk/js/exportImport.js';
import { parseHTML } from 'linkedom';

test('N5 reset: corrupt primary requires primary archive; quota failure returns coded error', () => {
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev:tmp');
  // Minimal DOM stubs
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  Object.assign(globalThis, { window, document, Blob });
  // Confirm path
  window.confirm = ()=>true;
  // Fail the primary-archive write
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => {
    if (k === 'natverk:data-prev:tmp') throw new Error('quota');
    return origSet(k, v);
  };
  try{
    const res = exportAndClearRecovery();
    assert.equal(res.ok, false);
    assert.equal(res.code, 'primary_archive_failed');
    // Primary remains unchanged
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), corrupt);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

test('N5 reset: existing primary-archive differs — rotate to prev-2 and replace ok', () => {
  const orig = defaultData(); orig.company.name = 'Keep';
  const origBytes = JSON.stringify(orig);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, origBytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, origBytes);
  const mismatch = '{"mismatch":true}';
  globalThis.localStorage.setItem('natverk:data-prev', mismatch);
  // Minimal DOM stubs
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  Object.assign(globalThis, { window, document, Blob });
  window.confirm = ()=>true;
  const res = exportAndClearRecovery();
  assert.equal(res.ok, true);
  // Rotation: prev holds pre-reset primary (orig), prev-2 carries the mismatch
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), origBytes);
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev-2'), mismatch);
});

