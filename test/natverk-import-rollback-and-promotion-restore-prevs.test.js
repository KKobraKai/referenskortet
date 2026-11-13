import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('import: save failure — restore attempts both archives; report rollback_failed on restore error', () => {
  // Seed primary and archives
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"OLDPREV"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"OLDP2"}');
  // Stub: primary write fails (so saveData fails), and restoring data-prev-2 via removeItem fails
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origRem = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.data) throw new Error('quota');
    return origSet(k, v);
  };
  // Ensure origPrev2 is null so restore path uses removeItem and we can fail it
  globalThis.localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
  globalThis.localStorage.removeItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrev2) throw new Error('deny-restore');
    return origRem(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    // Must be a rollback failure (not generic storage error)
    assert.equal(res.code, 'rollback_failed');
  } finally {
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.removeItem = origRem;
  }
});

test('import: recovery-promotion failure restores data-prev and data-prev-2 to originals', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"PV1"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"PV2"}');
  // Recovery exists with bytes
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Abytes);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  // Fail promotion to recoveryPrev to trigger rollback path
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.recoveryPrev) throw new Error('quota');
    return origSet(k, v);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    // data-prev and data-prev-2 should be restored to originals
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), '{"prev":"PV1"}');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), '{"prev2":"PV2"}');
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

