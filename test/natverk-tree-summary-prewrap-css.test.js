import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('M1 #tree-summary uses pre-wrap and wraps long words in print.css', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'natverk/print.css'), 'utf-8');
  // Require both white-space: pre-wrap and overflow-wrap:anywhere for #tree-summary
  assert.match(css, /#tree-summary[\s\S]*white-space\s*:\s*pre-wrap/i, 'tree-summary must use pre-wrap');
  assert.match(css, /#tree-summary[\s\S]*overflow-wrap\s*:\s*anywhere/i, 'tree-summary must wrap long words');
});

