import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, loadData, saveData } from '../natverk/js/storage.js';

async function bootDom() {
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
  // stub createObjectURL
  window.URL.createObjectURL = ()=> 'blob:ok';
  window.URL.revokeObjectURL = ()=> {};
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document };
}

test('Export-then-clear with confirm resets corrupt data; save ok and stays after reload', async () => {
  // Seed corrupt primary and recovery
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  const { window, document } = await bootDom();
  // Confirm reset and click Export-then-clear
  window.confirm = ()=>true;
  const btn = document.getElementById('btn-export-then-clear');
  btn.click();
  // Now saving defaults should succeed
  const ok1 = saveData(defaultData());
  assert.equal(ok1.ok, true);
  // And after reload, still valid and saves
  const re = loadData();
  assert.equal(re.schemaVersion, CONFIG.schemaVersion);
  const ok2 = saveData(re);
  assert.equal(ok2.ok, true);
});

