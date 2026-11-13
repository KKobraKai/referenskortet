import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { exportAndClearRecovery } from '../natverk/js/exportImport.js';
import { parseHTML } from 'linkedom';

function stubWindow() {
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  window.confirm = ()=> true;
  Object.assign(globalThis, { window, document, Blob });
}

test('N5 reset: two resets rotate prev and prev-2', () => {
  stubWindow();
  // Primary A with recovery present
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Abytes);
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev-2');
  // First reset -> prev becomes A
  const r1 = exportAndClearRecovery();
  assert.equal(r1.ok, true);
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), Abytes);
  // Seed primary B and recovery again
  const B = defaultData(); B.company.name = 'B';
  const Bbytes = JSON.stringify(B);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Bbytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Bbytes);
  // Second reset -> prev becomes B, prev-2 becomes A
  const r2 = exportAndClearRecovery();
  assert.equal(r2.ok, true);
  const prev = globalThis.localStorage.getItem('natverk:data-prev');
  const prev2 = globalThis.localStorage.getItem('natverk:data-prev-2');
  assert.equal(prev, Bbytes);
  assert.equal(prev2, Abytes);
});

