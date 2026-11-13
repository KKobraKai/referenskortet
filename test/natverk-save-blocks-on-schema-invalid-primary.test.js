import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, saveData } from '../natverk/js/storage.js';

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
  Object.assign(globalThis, { window, document, CustomEvent, Blob });
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document };
}

test('2(c) schema-invalid primary blocks normal save without recovery', async () => {
  // Put parseable but schema-invalid JSON in primary and ensure no recovery exists
  const invalid = '{"schemaVersion":1,"company":{"name":"X","desc":"Y"},"current":{"areas":[{"name":"A","contacts":["x","y"]}],"partners":[]},"wanted":{"areas":[],"partners":[]},"weekly":{"usedAreaIndexes":[],"history":[]},"oneToOnes":[]}';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, invalid);
  globalThis.localStorage.removeItem(CONFIG.storageKeys.recovery);
  // Direct save must be blocked
  const r = saveData(defaultData());
  assert.equal(r.ok, false, 'save must be refused while invalid primary exists');
  assert.equal(r.code, 'recovery_unconfirmed');
  // UI flow: editing company name triggers save and should show export prompts
  const { document } = await bootAppDom();
  const name = document.querySelector('#companyName');
  name.value = 'ACME'; name.dispatchEvent(new document.defaultView.Event('input'));
  const backupBtn = document.querySelector('#btn-export-backup');
  const clearBtn = document.querySelector('#btn-export-then-clear');
  assert.equal(backupBtn.hidden, false);
  assert.equal(clearBtn.hidden, false);
});

