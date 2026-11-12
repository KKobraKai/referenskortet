import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Fail-first for eaec2677: narrow guard against empty catch {} in rollback/restore paths.
test('guard: no empty catch blocks in rollback/restore paths', () => {
  const files = [
    path.join(process.cwd(), 'natverk/js/exportImport.js'),
    path.join(process.cwd(), 'natverk/js/storageOps.js')
  ];
  const offenders = [];
  const ctxRe = /rollback|restore|origPrev|recoveryPrevTmp/i;
  const emptyCatchRe = /catch\s*\{\s*\}/;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf-8');
    const lines = src.split('\n');
    for (let i=0;i<lines.length;i++){
      if (emptyCatchRe.test(lines[i])) {
        // Scan small context window above for rollback/restore semantics
        const start = Math.max(0, i - 6);
        const context = lines.slice(start, i+1).join('\n');
        if (ctxRe.test(context)) {
          offenders.push(`${path.basename(f)}:${i+1}`);
        }
      }
    }
  }
  assert.equal(offenders.length, 0, `Empty catch{} found in rollback/restore context at: ${offenders.join(', ')}`);
});

