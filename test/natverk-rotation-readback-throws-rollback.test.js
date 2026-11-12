import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('rotation: read-back after setItem(data-prev-2) throws — prev-2 restored to original', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"PV1"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"PV2"}');
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  let justWrotePrev2 = false;
  let injectOncePrev2 = true;
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.dataPrev2 && injectOncePrev2) justWrotePrev2 = true;
    return origSet(k, v);
  };
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrev2 && justWrotePrev2 && injectOncePrev2) { justWrotePrev2 = false; injectOncePrev2 = false; throw new Error('injected'); }
    return origGet(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rotation_failed');
    // No slots modified
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), '{"prev":"PV1"}');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), '{"prev2":"PV2"}');
  } finally {
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.getItem = origGet;
  }
});

test('rotation: read-back after setItem(data-prev) throws — prev restored to original', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"PV1"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"PV2"}');
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origGet = globalThis.localStorage.getItem.bind(globalThis.localStorage);
  let justWrotePrev = false;
  let injectOncePrev = true;
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.dataPrev && injectOncePrev) justWrotePrev = true;
    return origSet(k, v);
  };
  globalThis.localStorage.getItem = (k) => {
    if (k === CONFIG.storageKeys.dataPrev && justWrotePrev && injectOncePrev) { justWrotePrev = false; injectOncePrev = false; throw new Error('injected'); }
    return origGet(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rotation_failed');
    // No slots modified (prev restored to PV1, prev2 restored to PV2)
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), '{"prev":"PV1"}');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), '{"prev2":"PV2"}');
  } finally {
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.getItem = origGet;
  }
});

