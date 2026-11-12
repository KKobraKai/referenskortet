import test from 'node:test';
import assert from 'node:assert/strict';
import { I18N } from '../natverk/js/i18n.js';

test('i18n has identical key sets for sv and en', () => {
  const svKeys = new Set(Object.keys(I18N.sv));
  const enKeys = new Set(Object.keys(I18N.en));
  for(const k of svKeys){ assert.ok(enKeys.has(k), `en missing ${k}`); }
  for(const k of enKeys){ assert.ok(svKeys.has(k), `sv missing ${k}`); }
});
