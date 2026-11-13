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

test('nested bad import leaves storage unchanged', () => {
  const start = defaultData();
  start.company.name = 'Good';
  saveData(start);
  const bad = JSON.stringify({
    schemaVersion: 1,
    company: { name: 'X', desc: 'Y' },
    current: start.current,
    wanted: start.wanted,
    weekly: { usedAreaIndexes: [0], history: [ { week: 5, areaIndex: 0, who: 'A', why: 'B', short: 'C' } ] },
    oneToOnes: [ null ] // invalid
  });
  const res = importJsonString(bad);
  assert.equal(res.ok, false);
  const after = loadData();
  assert.equal(after.company.name, 'Good');
});

test('unsupported schemaVersion rejected', () => {
  const start = defaultData();
  saveData(start);
  const bad = JSON.stringify({ ...start, schemaVersion: 999 });
  const res = importJsonString(bad);
  assert.equal(res.ok, false);
});

test('oneToOnes fields must be real strings: null/missing rejected, storage unchanged', () => {
  const start = defaultData();
  start.company.name = 'Base';
  saveData(start);
  const base = loadData();
  // null field
  const bad1 = JSON.stringify({
    schemaVersion: CONFIG.schemaVersion,
    company: base.company,
    current: base.current,
    wanted: base.wanted,
    weekly: { usedAreaIndexes: [], history: [] },
    oneToOnes: [ { id:'1', who:'A', where:'B', time:'', goals:'', fields:{ vision:null, interests:'', networks:'', skills:'', projects:'', listen:'', intro:'', offer:'', next:'', nextmeet:'' } } ]
  });
  const r1 = importJsonString(bad1);
  assert.equal(r1.ok, false);
  assert.deepEqual(loadData().company, base.company);
  // missing field
  const bad2 = JSON.stringify({
    schemaVersion: CONFIG.schemaVersion,
    company: base.company,
    current: base.current,
    wanted: base.wanted,
    weekly: { usedAreaIndexes: [], history: [] },
    oneToOnes: [ { id:'2', who:'A', where:'B', time:'', goals:'', fields:{ /* vision missing */ interests:'', networks:'', skills:'', projects:'', listen:'', intro:'', offer:'', next:'', nextmeet:'' } } ]
  });
  const r2 = importJsonString(bad2);
  assert.equal(r2.ok, false);
  assert.deepEqual(loadData().company, base.company);
});
