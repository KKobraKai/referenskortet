import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

async function bootAppDom(lang='en') {
  const html = fs.readFileSync(path.join(process.cwd(), 'natverk/index.html'), 'utf-8');
  const { window, document, CustomEvent, Blob } = parseHTML(html);
  globalThis.localStorage.setItem(CONFIG.storageKeys.lang, lang);
  // Ensure language isolation regardless of module cache ordering
  const i18nPath = path.join(process.cwd(), 'natverk/js/i18n.js');
  const i18n = await import(url.pathToFileURL(i18nPath).href);
  if (i18n && typeof i18n.setLang === 'function') i18n.setLang(lang);
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

test('import keeps previous recovery in archive and shows notice', async () => {
  const { document } = await bootAppDom('en');
  const corrupt = '{"schemaVersion":1,'; // corrupt raw
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  // prepare valid payload
  const valid = defaultData();
  valid.company.name = 'AfterImport';
  const res = importJsonString(JSON.stringify(valid));
  assert.equal(res.ok, true, 'import must succeed');
  // Recovery should be archived, byte-identical
  const archived = globalThis.localStorage.getItem('natverk:recovery-prev');
  assert.equal(archived, corrupt, 'archived recovery must match corrupt bytes exactly');
  // Notice shown
  const status = document.querySelector('#status').textContent || '';
  assert.match(status, /previous data kept/i);
});

