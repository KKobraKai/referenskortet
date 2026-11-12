import test from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, pickNextWantedIndex } from '../natverk/js/rotation.js';

test('ISO week handling known dates', () => {
  // 2021-01-04 (Mon) is ISO week 1
  assert.equal(isoWeek(new Date('2021-01-04T00:00:00Z')), 1);
  // 2021-01-03 (Sun) is week 53 of previous year
  assert.equal(isoWeek(new Date('2021-01-03T00:00:00Z')), 53);
  // 2020-01-01 is week 1
  assert.equal(isoWeek(new Date('2020-01-01T00:00:00Z')), 1);
});

test('rotation picks next unused and wraps', () => {
  const areas = [{name:'A'},{name:'B'},{name:'C'},{name:''},{name:''}];
  // Force week so modulo starts at 0
  const week0 = new Date('2020-01-01T00:00:00Z'); // isoWeek=1 -> modulo 1%3 = 1 start
  // But we don't rely on exact index; simulate usage
  let used = [];
  let idx1 = pickNextWantedIndex(areas, used, week0);
  used.push(idx1);
  let idx2 = pickNextWantedIndex(areas, used, week0);
  used.push(idx2);
  let idx3 = pickNextWantedIndex(areas, used, week0);
  used.push(idx3);
  // All three picked once; next wraps by modulo
  let idx4 = pickNextWantedIndex(areas, used, week0);
  assert.ok([0,1,2].includes(idx1));
  assert.ok([0,1,2].includes(idx2));
  assert.ok([0,1,2].includes(idx3));
  assert.equal(idx4, 1); // consistent wrap by modulo start (isoWeek=1 -> start=1)
});
