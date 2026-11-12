import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, loadData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('importing valid backup over corrupt primary succeeds and loads after reload', () => {
  // Corrupt primary
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  // Ensure any previous recovery exists (simulate prior copy)
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  const next = defaultData();
  next.company.name = 'AfterImportOK';
  const res = importJsonString(JSON.stringify(next));
  assert.equal(res.ok, true, 'import should succeed over corrupt primary');
  const reloaded = loadData();
  assert.equal(reloaded.company.name, 'AfterImportOK', 'reloaded data must reflect imported content');
});

