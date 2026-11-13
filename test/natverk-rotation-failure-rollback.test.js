import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString, exportAndClearRecovery } from '../natverk/js/exportImport.js';
import { parseHTML } from 'linkedom';

function stubWindowConfirm() {
  const { window, document, Blob } = parseHTML('<html><body></body></html>');
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  window.confirm = ()=> true;
  Object.assign(globalThis, { window, document, Blob });
}

test('N5 import: failure at setItem(data-prev:tmp) rolls back unchanged', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k,v) => {
    if (k === 'natverk:data-prev:tmp') throw new Error('quota');
    return origSet(k,v);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'primary_archive_failed');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), null);
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev-2'), null);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

test('N5 import: failure at setItem(data-prev-2) rolls back unchanged', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  // Ensure prev exists so rotation attempts to write prev-2
  globalThis.localStorage.setItem('natverk:data-prev', '{"old":"prev"}');
  globalThis.localStorage.removeItem('natverk:data-prev-2');
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k,v) => {
    if (k === 'natverk:data-prev-2') throw new Error('quota');
    return origSet(k,v);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rotation_failed');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), '{"old":"prev"}');
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev-2'), null);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

test('N5 import: failure at setItem(data-prev) rolls back unchanged', () => {
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  // Clear archives
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev-2');
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k,v) => {
    if (k === 'natverk:data-prev') throw new Error('quota');
    return origSet(k,v);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rotation_failed');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), null);
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev-2'), null);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

test('N5 reset: rotation failure rolls back unchanged', () => {
  stubWindowConfirm();
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Abytes);
  // Ensure a prev exists to trigger prev-2 write
  globalThis.localStorage.setItem('natverk:data-prev', '{"old":"prev"}');
  globalThis.localStorage.removeItem('natverk:data-prev-2');
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k,v) => {
    if (k === 'natverk:data-prev-2') throw new Error('quota');
    return origSet(k,v);
  };
  try{
    const res = exportAndClearRecovery();
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rotation_failed');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), Abytes);
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), '{"old":"prev"}');
    assert.equal(globalThis.localStorage.getItem('natverk:data-prev-2'), null);
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

