import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { I18N } from '../natverk/js/i18n.js';

function collectErrorCodes() {
  const dir = path.join(process.cwd(), 'natverk/js');
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
  const codes = new Set();
  const re = /code:'([a-z0-9_\\-]+)'/gi;
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf-8');
    let m;
    while ((m = re.exec(src)) !== null) {
      codes.add(m[1]);
    }
  }
  return Array.from(codes).sort();
}

test('N3: Every error code in src has an i18n key in sv and en', () => {
  const codes = collectErrorCodes();
  const sv = I18N.sv || {};
  const en = I18N.en || {};
  const missingSv = codes.filter(c => !(c in sv));
  const missingEn = codes.filter(c => !(c in en));
  const msg = (list)=> list.length ? list.join(', ') : 'none';
  assert.equal(missingSv.length, 0, `sv missing: ${msg(missingSv)}`);
  assert.equal(missingEn.length, 0, `en missing: ${msg(missingEn)}`);
});

