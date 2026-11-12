import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('print.css does not force hidden panels visible', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'natverk/print.css'), 'utf-8');
  assert.ok(!/\.panel\s*\{\s*display\s*:\s*block/i.test(css));
});

test('styles.css has no escaped attribute selectors', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'natverk/styles.css'), 'utf-8');
  assert.ok(!/label\[for=\\\"import-file\\\"\]/.test(css));
});

test('no UI for modules M4–M8 present in HTML', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  for (let i = 4; i <= 8; i++) {
    assert.ok(!html.includes(`id="tab-m${i}"`));
    assert.ok(!html.includes(`id="panel-m${i}"`));
  }
});

test('M1 print hides form and shows summary element', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'natverk/styles.css'), 'utf-8');
  assert.ok(/@media print[\s\S]*#panel-m1/.test(css));
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  assert.ok(html.includes('id="tree-summary"'));
  assert.ok(html.includes('class="card screen-only"') || html.includes('screen-only'));
});

test('M3 print shows only dedicated print element', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'natverk/styles.css'), 'utf-8');
  assert.ok(/#panel-m3 #one-print\{display:block\}/.test(css) || /#panel-m3 #one-print\{/.test(css));
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  assert.ok(html.includes('id="one-print"'));
});
