import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function parseHeadersBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let current = { path: null, headers: [] };
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const isPath = !line.startsWith(' ');
    if (isPath) {
      if (current.path) blocks.push(current);
      current = { path: line.trim(), headers: [] };
    } else {
      current.headers.push(line.trim());
    }
  }
  if (current.path) blocks.push(current);
  return blocks;
}

function parseCsp(line) {
  const idx = line.indexOf(':');
  const value = line.slice(idx + 1).trim();
  const directives = value.split(';').map(s => s.trim()).filter(Boolean);
  const map = {};
  for (const d of directives) {
    const [name, ...rest] = d.split(/\s+/);
    map[name] = rest;
  }
  return map;
}

test('strict CSP for /natverk/* detaches and restricts to self', () => {
  const hdr = fs.readFileSync(path.join(process.cwd(), '_headers'), 'utf-8');
  const blocks = parseHeadersBlocks(hdr);
  const block = blocks.find(b => b.path === '/natverk/*');
  assert.ok(block, 'missing /natverk/* block');
  const detach = block.headers.find(h => h.toLowerCase().startsWith('! content-security-policy'));
  assert.ok(detach, 'missing detach for Content-Security-Policy');
  const cspLine = block.headers.find(h => h.startsWith('Content-Security-Policy:'));
  assert.ok(cspLine, 'missing CSP line');
  const csp = parseCsp(cspLine);
  // script-src self only
  assert.deepEqual(csp['script-src'], ["'self'"]);
  // style-src self only (no unsafe-inline)
  assert.ok(csp['style-src'] && csp['style-src'].includes("'self'"));
  assert.ok(!csp['style-src'].includes("'unsafe-inline'"));
  // img-src self and data:
  assert.ok(csp['img-src'] && csp['img-src'].includes("'self'") && csp['img-src'].includes('data:'));
  assert.ok(!csp['img-src'].some(tok => tok.startsWith('http')));
  // connect-src self only (no cloudflareinsights)
  assert.deepEqual(csp['connect-src'], ["'self'"]);
});

test('no external script/img origins in natverk HTML/JS', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  // scripts
  const scriptSrcs = Array.from(html.matchAll(/<script[^>]*\s+src=["']([^"']+)["']/gi)).map(m => m[1]);
  for (const src of scriptSrcs) {
    assert.ok(!/^https?:\/\//i.test(src), `external script src not allowed: ${src}`);
  }
  const imgSrcs = Array.from(html.matchAll(/<img[^>]*\s+src=["']([^"']+)["']/gi)).map(m => m[1]);
  for (const src of imgSrcs) {
    assert.ok(!/^https?:\/\//i.test(src), `external img src not allowed: ${src}`);
  }
});

