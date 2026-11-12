import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function listJsFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!fs.existsSync(cur)) continue;
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.git')) continue;
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile() && p.endsWith('.js')) out.push(p);
    }
  }
  return out;
}

test('no SCANNER_ or scanSourceBuggy in test/ or tools/', () => {
  const roots = [path.join(process.cwd(), 'test'), path.join(process.cwd(), 'tools')];
  const files = roots.flatMap(listJsFiles);
  const hits = [];
  for (const f of files) {
    if (f.endsWith(path.join('test', 'no-env-switch-strings-present.test.js'))) continue; // ignore self
    const src = fs.readFileSync(f, 'utf-8');
    if (src.includes('SCANNER_') || src.includes('scanSourceBuggy')) {
      hits.push(f);
    }
  }
  assert.equal(hits.length, 0, `Forbidden tokens present in: ${hits.join(', ')}`);
});

