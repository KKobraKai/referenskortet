import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';

async function bootAppDom(lang='en') {
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  const { window, document, CustomEvent, Blob } = parseHTML(html);
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

test('#3 M1 header Print rebuilds M1+M3 from live state (tree-summary reflects last edits)', async () => {
  const { document } = await bootAppDom('en');
  // Edit M1 wanted area name and first contact
  const areaName = document.querySelector('#wanted-areas .area input');
  assert.ok(areaName, 'area name input should exist');
  areaName.value = 'Plumbing'; areaName.dispatchEvent(new document.defaultView.Event('input'));
  const firstContact = document.querySelector('#wanted-areas .area .slot input');
  assert.ok(firstContact, 'first contact input should exist');
  firstContact.value = 'Alice'; firstContact.dispatchEvent(new document.defaultView.Event('input'));
  // Now click the header Print button
  document.querySelector('#btn-print').click();
  const summary = document.querySelector('#tree-summary').textContent || '';
  // Expect the summary to include the edited area/contact
  assert.match(summary, /Plumbing/);
  assert.match(summary, /Alice/);
});

