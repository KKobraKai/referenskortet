import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scanSource as scan } from './lib/catchScanner.js';

// Stricter guard: parse catch blocks (multi-line), fail on unbound catch,
// and on bodies with no real statements (empty or comment-only).
test('guard: no empty or unbound catch blocks in target files', () => {
  const files = [
    path.join(process.cwd(), 'natverk/js/exportImport.js'),
    path.join(process.cwd(), 'natverk/js/storageOps.js')
  ];
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf-8');
    offenders.push(...scan(src, path.basename(f)));
  }
  assert.equal(offenders.length, 0, `Bad catch blocks found at: ${offenders.join(', ')}`);
});

