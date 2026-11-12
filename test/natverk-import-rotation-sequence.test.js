import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('N5 import: A -> B -> C rotates prev and prev-2 correctly', () => {
  // Seed primary A
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.removeItem('natverk:data-prev');
  globalThis.localStorage.removeItem('natverk:data-prev-2');
  // Import B
  const B = defaultData(); B.company.name = 'B';
  const r1 = importJsonString(JSON.stringify(B));
  assert.equal(r1.ok, true);
  assert.equal(globalThis.localStorage.getItem('natverk:data-prev'), Abytes);
  // Import C
  const C = defaultData(); C.company.name = 'C';
  const r2 = importJsonString(JSON.stringify(C));
  assert.equal(r2.ok, true);
  // Now prev holds B, prev-2 holds A
  const prev = globalThis.localStorage.getItem('natverk:data-prev');
  const prev2 = globalThis.localStorage.getItem('natverk:data-prev-2');
  assert.equal(JSON.parse(prev).company.name, 'B');
  assert.equal(JSON.parse(prev2).company.name, 'A');
});

