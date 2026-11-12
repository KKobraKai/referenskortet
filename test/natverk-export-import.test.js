import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import { defaultData, loadData, saveData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';
import { setAreaName } from '../natverk/js/model.js';

test('export then import round-trips identically', () => {
  // prepare data
  const data = defaultData();
  data.company.name = 'ACME';
  data.company.desc = 'Widgets';
  setAreaName(data, 'wanted', 0, 'Retail');
  saveData(data);
  const before = loadData();
  const json = JSON.stringify(before);
  const res = importJsonString(json);
  assert.equal(res.ok, true);
  const after = loadData();
  assert.deepEqual(after, before);
});

test('malformed import rejected without changing stored data', () => {
  const start = defaultData();
  start.company.name = 'KeepMe';
  saveData(start);
  const bad = '{ not json }';
  const res = importJsonString(bad);
  assert.equal(res.ok, false);
  const current = loadData();
  assert.equal(current.company.name, 'KeepMe');
});
