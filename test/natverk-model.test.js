import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../natverk/js/config.js';
import { defaultData } from '../natverk/js/storage.js';
import { setAreaName, setAreaContact, computeGaps } from '../natverk/js/model.js';

test('limits enforced: 6th area rejected, 4th contact rejected', () => {
  const data = defaultData();
  // Valid within limits
  assert.equal(setAreaName(data, 'wanted', 4, 'Area5'), true);
  assert.equal(setAreaContact(data, 'wanted', 4, 2, 'Contact3'), true);
  // Out of bounds
  assert.equal(setAreaName(data, 'wanted', CONFIG.limits.maxAreas, 'TooMany'), false);
  assert.equal(setAreaContact(data, 'wanted', 0, CONFIG.limits.maxContactsPerArea, 'TooMany'), false);
});

test('gaps computed', () => {
  const data = defaultData();
  // Fill one area name and one contact on wanted side
  setAreaName(data, 'wanted', 0, 'X');
  setAreaContact(data, 'wanted', 0, 0, 'Y');
  const gaps = computeGaps(data);
  assert.ok(gaps.wantedAreas === CONFIG.limits.maxAreas - 1);
  assert.ok(gaps.wantedContacts === (CONFIG.limits.maxAreas * CONFIG.limits.maxContactsPerArea) - 1);
});
