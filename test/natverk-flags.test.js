import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledModules } from '../natverk/js/config.js';

test('flags default: M1-M3 on; M4-M8 off', () => {
  const mods = enabledModules();
  assert.equal(mods.M1, true);
  assert.equal(mods.M2, true);
  assert.equal(mods.M3, true);
  for(const m of ['M4','M5','M6','M7','M8']){
    assert.equal(mods[m], false, `${m} should be off`);
  }
});
