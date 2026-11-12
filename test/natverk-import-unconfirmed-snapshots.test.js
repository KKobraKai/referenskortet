import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('import: transient primary read error must not erase primary on later rollback', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recoveryPrev, '{"prev":"PV"}');
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  let threwOnce = false;
  globalThis.localStorage.getItem = (k) => {
    if (!threwOnce && k === CONFIG.storageKeys.data) { threwOnce = true; throw new Error('transient'); }
    return origGet(k);
  };
  // Force promotion failure later
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.recoveryPrev) throw new Error('quota');
    return origSet(k, v);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    // Primary must remain intact — a transient read error must not null it out
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
  } finally {
    globalThis.localStorage.getItem = origGet;
    globalThis.localStorage.setItem = origSet;
  }
});

test('import: transient recoveryPrev read error must not erase recoveryPrev on later rollback', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recoveryPrev, '{"prev":"PV"}');
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  let threwOnce = false;
  globalThis.localStorage.getItem = (k) => {
    if (!threwOnce && k === CONFIG.storageKeys.recoveryPrev) { threwOnce = true; throw new Error('transient'); }
    return origGet(k);
  };
  // Force promotion failure later
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.recoveryPrev) throw new Error('quota');
    return origSet(k, v);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    // recoveryPrev must remain intact — a transient read error must not null it out
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), '{"prev":"PV"}');
  } finally {
    globalThis.localStorage.getItem = origGet;
    globalThis.localStorage.setItem = origSet;
  }
});

