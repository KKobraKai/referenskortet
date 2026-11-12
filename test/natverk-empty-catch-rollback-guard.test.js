import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Stricter guard: no empty catch {} blocks at all in the listed files.
test('guard: no empty catch blocks in target files', () => {
  const files = [
    path.join(process.cwd(), 'natverk/js/exportImport.js'),
    path.join(process.cwd(), 'natverk/js/storageOps.js')
  ];
  const offenders = [];
  const emptyCatchRe = /catch\s*\{\s*\}/;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf-8');
    const lines = src.split('\n');
    for (let i=0;i<lines.length;i++){
      if (emptyCatchRe.test(lines[i])) offenders.push(`${path.basename(f)}:${i+1}`);
    }
  }
  assert.equal(offenders.length, 0, `Empty catch{} found at: ${offenders.join(', ')}`);
});

