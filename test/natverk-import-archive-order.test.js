import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('import archives recovery first; archive failure returns error and changes nothing', () => {
  // Arrange: set an existing recovery raw
  const corrupt = '{"schemaVersion":1,"bad":true}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  // Prepare valid payload
  const valid = defaultData();
  valid.company.name = 'Imported';
  // Monkey-patch setItem to fail only for recoveryPrev
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  globalThis.localStorage.setItem = (k, v) => {
    if (k === CONFIG.storageKeys.recoveryPrevTmp) {
      throw new Error('archive denied');
    }
    return origSet(k, v);
  };
  try{
    const res = importJsonString(JSON.stringify(valid));
    // Expect a coded failure and no changes
    assert.equal(res.ok, false);
    assert.equal(res.code, 'archive_failed');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), corrupt, 'recovery must remain intact');
    assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), null, 'archive must not be created');
  } finally {
    globalThis.localStorage.setItem = origSet;
  }
});

