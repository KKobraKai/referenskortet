import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import '../natverk/js/localStorageShim.js';

test('M3 print uses pre-wrap/anywhere and header print fills block', async () => {
  // CSS checks
  const css = fs.readFileSync(path.join(process.cwd(), 'natverk/print.css'), 'utf-8');
  assert.match(css, /#one-print[\s\S]*white-space:\s*pre-wrap/i, 'white-space: pre-wrap missing for #one-print');
  assert.match(css, /#one-print[\s\S]*overflow-wrap:\s*anywhere/i, 'overflow-wrap: anywhere missing for #one-print');
  // DOM fill check
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  const { window, document, CustomEvent, Blob } = parseHTML(html);
  // Make select.value writable for linkedom
  const sel = document.getElementById('lang-select');
  if (sel) {
    try{
      Object.defineProperty(sel, 'value', {
        configurable: true,
        get(){ return this.getAttribute('value') || (this.options[this.selectedIndex] && this.options[this.selectedIndex].value) || ''; },
        set(v){
          const s = String(v);
          this.setAttribute('value', s);
          for (let i=0;i<this.options.length;i++){
            if (this.options[i].value === s) { this.selectedIndex = i; break; }
          }
        }
      });
    }catch{}
  }
  Object.assign(globalThis, { window, document, CustomEvent, Blob });
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  // Fill current form and trigger header print
  document.querySelector('#one-who').value = 'Charlie';
  document.querySelector('#one-where').value = 'Cafe';
  const long = 'L'.repeat(500);
  document.querySelector('#ag-vision').value = `Line1\nLine2 ${long}`;
  let printed = false; window.print = ()=>{ printed = true; };
  document.querySelector('#btn-print').click();
  assert.equal(printed, true);
  const text = document.querySelector('#one-print').textContent || '';
  assert.match(text, /Charlie/);
  assert.match(text, /Line1/);
  assert.match(text, /Line2/);
});

