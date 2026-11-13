import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import '../natverk/js/localStorageShim.js';
import { CONFIG } from '../natverk/js/config.js';

async function bootAppDom(lang='en') {
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  const { window, document, CustomEvent, Blob } = parseHTML(html);
  // Set language before app init
  globalThis.localStorage.setItem(CONFIG.storageKeys.lang, lang);
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
  // Minimal stubs
  window.print = () => {};
  window.navigator.clipboard = { writeText: async ()=>{} };
  window.URL.createObjectURL = (b) => 'blob:stub';
  window.URL.revokeObjectURL = () => {};
  Object.assign(globalThis, { window, document, CustomEvent, Blob });
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document };
}

test('1-2-1 save failure does not add list entry and shows translated error', async () => {
  const { document } = await bootAppDom('en');
  // Force storage failures
  const originalSetItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('quota exceeded'); };
  try{
    // Fill minimal valid fields
    document.querySelector('#one-who').value = 'A';
    document.querySelector('#one-where').value = 'B';
    document.querySelector('#one-time').value = '';
    document.querySelector('#one-goals').value = 'ok';
    // Click save
    document.querySelector('#btn-save-121').click();
    // Must not add to list
    const items = Array.from(document.querySelectorAll('#one-list li'));
    assert.equal(items.length, 0, 'list must remain empty when save fails');
    // Status must show an English error (prefix 'Could not save')
    const status = document.querySelector('#status').textContent || '';
    assert.match(status, /Could not save/i);
  } finally {
    globalThis.localStorage.setItem = originalSetItem;
  }
});

