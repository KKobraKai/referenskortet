import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { execSync } from 'node:child_process';

test('no inline style= attributes and no inline <script> without src in natverk/*.html', () => {
  const dir = path.join(process.cwd(), 'natverk');
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.html')).map(f=>path.join(dir, f));
  assert.ok(files.length > 0, 'no natverk HTML files found');
  for (const f of files) {
    // Default to current worktree HTML; allow override via NATVERK_HTML_CHECK_REF
    let html = fs.readFileSync(f, 'utf-8');
    const ref = process.env.NATVERK_HTML_CHECK_REF;
    if (ref) {
      const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
      html = execSync(`git show ${ref}:${rel}`, { encoding: 'utf-8' });
    }
    const { document } = parseHTML(html);
    // Fail on any inline style attribute
    const allEls = Array.from(document.querySelectorAll('*'));
    for (const el of allEls) {
      const names = (el.getAttributeNames && el.getAttributeNames()) || [];
      assert.ok(!names.includes('style'), `inline style attribute found in ${path.basename(f)} on <${el.tagName.toLowerCase()}>`);
      // Fail on any inline event handler (on*)
      assert.ok(!names.some(n => /^on/i.test(n)), `inline on* handler found in ${path.basename(f)} on <${el.tagName.toLowerCase()}>`);
    }
    // Scripts: require external src (no inline JS)
    const scripts = Array.from(document.querySelectorAll('script'));
    assert.ok(scripts.length >= 1, `no <script> tag found in ${path.basename(f)}`);
    for (const s of scripts) {
      assert.ok(!!s.getAttribute('src'), `inline <script> without src found in ${path.basename(f)}`);
    }
  }
});

