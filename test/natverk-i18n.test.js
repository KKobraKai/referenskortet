import test from 'node:test';
import assert from 'node:assert/strict';
import { I18N } from '../natverk/js/i18n.js';
import fs from 'node:fs';
import path from 'node:path';

test('i18n has identical key sets for sv and en', () => {
  const svKeys = new Set(Object.keys(I18N.sv));
  const enKeys = new Set(Object.keys(I18N.en));
  for(const k of svKeys){ assert.ok(enKeys.has(k), `en missing ${k}`); }
  for(const k of enKeys){ assert.ok(svKeys.has(k), `sv missing ${k}`); }
});

test('app.js does not contain hard-coded user-facing strings', () => {
  const app = fs.readFileSync(path.join(process.cwd(), 'natverk/js/app.js'), 'utf-8');
  const forbidden = [
    'Önskade områden', 'Nuvarande områden',
    '`v${', 'Copied', 'Cannot copy', 'Delete'
  ];
  for (const f of forbidden){
    assert.ok(!app.includes(f), `hard-coded string found: ${f}`);
  }
});
