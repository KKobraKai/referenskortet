import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import '../natverk/js/localStorageShim.js';

async function boot(lang='en') {
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  const { window, document, CustomEvent, Blob } = parseHTML(html);
  const selEl = document.getElementById('lang-select');
  if (selEl) {
    try{
      Object.defineProperty(selEl, 'value', {
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
  // Set language
  window.localStorage.setItem('natverk_lang', lang);
  Object.assign(globalThis, { window, document, CustomEvent, Blob });
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document };
}

function forceQuotaError() {
  const orig = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('quota exceeded'); };
  return () => { globalThis.localStorage.setItem = orig; };
}

test('weekly save error is translated (EN)', async () => {
  const { document } = await boot('en');
  const restore = forceQuotaError();
  try{
    // Select an area and attempt to save weekly
    const sel = document.querySelector('#ask-branch');
    sel.innerHTML = '<option value="0" selected>Area</option>';
    document.querySelector('#ask-who').value = 'W';
    document.querySelector('#ask-why').value = 'Y';
    document.querySelector('#btn-save-ask').click();
    const msg = document.querySelector('#status').textContent || '';
    assert.match(msg, /Could not save/i);
    assert.ok(!/quota/i.test(msg));
  } finally { restore(); }
});

test('delete 1-2-1 failure is translated and item stays (SV)', async () => {
  const { document } = await boot('sv');
  // Seed one item into state via UI and local save disabled path
  document.querySelector('#one-who').value = 'A';
  document.querySelector('#btn-save-121').click();
  // Now force save error and try delete
  const restore = forceQuotaError();
  try{
    // Ensure SV language before deletion
    const langSel = document.getElementById('lang-select');
    if (langSel) {
      langSel.value = 'sv';
      document.defaultView.document.getElementById('lang-select').dispatchEvent(new document.defaultView.Event('change'));
    }
    const before = document.querySelectorAll('#one-list li').length;
    const del = document.querySelector('#one-list .btn.danger');
    del.click();
    const after = document.querySelectorAll('#one-list li').length;
    const msg = document.querySelector('#status').textContent || '';
    assert.match(msg, /Kunde inte spara|Lagringsfel/i);
    assert.equal(after, before, 'item must remain when delete fails');
  } finally { restore(); }
});

