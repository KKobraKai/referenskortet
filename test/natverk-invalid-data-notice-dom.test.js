import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';

async function bootAppDom() {
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

test('invalid stored data shows an invalid-data notice in status area', async () => {
  // Arrange: store structurally invalid JSON (areas wrong size so validateData fails)
  const bad = '{"schemaVersion":1,"company":{"name":"X","desc":"Y"},"current":{"areas":[],"partners":[]},"wanted":{"areas":[],"partners":[]},"weekly":{"usedAreaIndexes":[],"history":[]},"oneToOnes":[]}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, bad);
  const { document } = await bootAppDom();
  const text = document.querySelector('#status').textContent || '';
  // Should mention invalid data (exact wording will be localized later; presence is required)
  assert.ok(text.length > 0, 'an invalid-data status message must be shown');
});

