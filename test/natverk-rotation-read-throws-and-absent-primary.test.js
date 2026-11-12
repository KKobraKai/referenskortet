import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, loadData } from '../natverk/js/storage.js';
import { importJsonString, exportAndClearRecovery } from '../natverk/js/exportImport.js';
import { parseHTML } from 'linkedom';

function stubWindowConfirmTrue() {
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  window.confirm = ()=> true;
  Object.assign(globalThis, { window, document, Blob });
}

test('rotation: getItem(data-prev) throws is NOT treated as null; no wipe, coded error', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  // Seed primary and both archives
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"X"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"Y"}');
  // Throw only when reading data-prev to simulate transient storage error
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  let threw = false;
  globalThis.localStorage.getItem = (k) => {
    if (!threw && k === CONFIG.storageKeys.dataPrev) { threw = true; throw new Error('denied'); }
    return origGet(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    // Should fail closed with rotation error
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rotation_failed');
    // No slots were modified
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), '{"prev":"X"}');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), '{"prev2":"Y"}');
  } finally {
    globalThis.localStorage.getItem = origGet;
  }
});

test('rotation: primary absent must still read archives; rollback must not delete them', () => {
  // Primary absent, archives present
  globalThis.localStorage.removeItem(CONFIG.storageKeys.data);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"X"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"Y"}');
  // Recovery present so exportAndClearRecovery proceeds past export step
  const rec = defaultData(); rec.company.name = 'REC';
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, JSON.stringify(rec));
  // Make save fail so exportAndClearRecovery performs a rollback using snapshots
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.data) throw new Error('quota');
    return origSet(k, v);
  };
  stubWindowConfirmTrue();
  try{
    const res = exportAndClearRecovery();
    assert.equal(res.ok, false);
    // Archives must remain byte-identical; a null snapshot must not remove them
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), '{"prev":"X"}');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), '{"prev2":"Y"}');
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

