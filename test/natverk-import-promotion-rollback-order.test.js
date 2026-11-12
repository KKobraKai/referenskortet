import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

test('promotion rollback restores in order: data, dataPrev, dataPrev2, recovery, recoveryPrev and continues after a failure', () => {
  // Seed primary A and archives plus recovery
  const A = defaultData(); A.company.name = 'A';
  const Abytes = JSON.stringify(A);
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, Abytes);
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev, '{"prev":"PV1"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.dataPrev2, '{"prev2":"PV2"}');
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, Abytes);
  // Cause promotion to fail
  const origSet = globalThis.localStorage.setItem.bind(globalThis.localStorage);
  const origRem = globalThis.localStorage.removeItem.bind(globalThis.localStorage);
  const order = [];
  let failDataOnce = true;
  let inRollback = false;
  globalThis.localStorage.setItem = (k, v) => {
    // Record order for restore attempts only (recognize keys we expect)
    if (inRollback && [CONFIG.storageKeys.data, CONFIG.storageKeys.dataPrev, CONFIG.storageKeys.dataPrev2, CONFIG.storageKeys.recovery, CONFIG.storageKeys.recoveryPrev].includes(k)) {
      // Only record/deny on restore of originals (match Abytes)
      if (k === CONFIG.storageKeys.data && v === Abytes) {
        order.push(`set:${k}`);
        if (failDataOnce) { failDataOnce = false; throw new Error('deny-data-restore'); }
      } else if (k !== CONFIG.storageKeys.data) {
        order.push(`set:${k}`);
      }
    }
    if (k === CONFIG.storageKeys.recoveryPrev) { inRollback = true; throw new Error('quota'); } // fail promotion
    return origSet(k, v);
  };
  globalThis.localStorage.removeItem = (k) => {
    if (inRollback && [CONFIG.storageKeys.data, CONFIG.storageKeys.dataPrev, CONFIG.storageKeys.dataPrev2, CONFIG.storageKeys.recovery, CONFIG.storageKeys.recoveryPrev].includes(k)) order.push(`rem:${k}`);
    return origRem(k);
  };
  try{
    const B = defaultData(); B.company.name = 'B';
    const res = importJsonString(JSON.stringify(B));
    assert.equal(res.ok, false);
    assert.equal(res.code, 'rollback_failed');
    // Expect first three attempts to be data, dataPrev, dataPrev2 (sets, not removes)
    const seq = order.filter(x=>x.startsWith('set:'));
    const seq5 = order.slice(0,5);
    assert.deepEqual(seq5, [
      `set:${CONFIG.storageKeys.data}`,
      `set:${CONFIG.storageKeys.dataPrev}`,
      `set:${CONFIG.storageKeys.dataPrev2}`,
      `set:${CONFIG.storageKeys.recovery}`,
      `rem:${CONFIG.storageKeys.recoveryPrev}`
    ]);
  } finally {
    globalThis.localStorage.setItem = origSet;
    globalThis.localStorage.removeItem = origRem;
  }
});

