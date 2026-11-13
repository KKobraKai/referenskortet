import test from 'node:test';
import assert from 'node:assert/strict';
import { validate121 } from '../natverk/js/validate.js';

function repeat(ch, n){ return new Array(n+1).join(ch); }

test('601-char field refused at save (validate121)', () => {
  const base = {
    who:'A', where:'B', time:'', goals:'ok',
    fields: { vision:'', interests:'', networks:'', skills:'', projects:'', listen:'', intro:'', offer:'', next:'', nextmeet:'' }
  };
  const long = repeat('x', 601);
  const bad = { ...base, fields: { ...base.fields, vision: long } };
  const r = validate121(bad);
  assert.equal(r.ok, false);
});
