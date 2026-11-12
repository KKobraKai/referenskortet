import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';

test('no inline style= attributes and no inline <script> without src in natverk/*.html', () => {
  const dir = path.join(process.cwd(), 'natverk');
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.html')).map(f=>path.join(dir, f));
  assert.ok(files.length > 0, 'no natverk HTML files found');
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf-8');
    assert.ok(!/\\sstyle="/i.test(html), `inline style attribute found in ${path.basename(f)}`);
    const { document } = parseHTML(html);
    const scripts = Array.from(document.querySelectorAll('script'));
    assert.equal(scripts.length, 1, `unexpected number of <script> tags in ${path.basename(f)}`);
    assert.ok(!!scripts[0].getAttribute('src'), `inline <script> without src found in ${path.basename(f)}`);
  }
});

