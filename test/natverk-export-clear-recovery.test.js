import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, saveData } from '../natverk/js/storage.js';
import { importJsonString } from '../natverk/js/exportImport.js';

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
  // Minimal stubs
  window.print = () => {};
  window.navigator.clipboard = { writeText: async ()=>{} };
  // URL helpers used by export
  window.URL.createObjectURL = (b) => 'blob:stub';
  window.URL.revokeObjectURL = () => {};
  // Bind globals
  Object.assign(globalThis, { window, document, CustomEvent, Blob });
  // Dynamically import the app module and trigger startup
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, document };
}

test('Export, then clear — clears recovery and enables saving again', async () => {
  // Arrange: put a recovery backup to block saves
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, '{"broken":true}');
  const { window, document } = await bootAppDom();
  const btn = document.querySelector('#btn-export-then-clear');
  assert.ok(btn, 'button must exist');
  assert.notEqual(btn.style.display, 'none', 'button must be visible when recovery present');
  // Act: click it
  // Confirm the reset explicitly
  if (window) window.confirm = ()=>true;
  btn.click();
  // Assert: recovery cleared and save works
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), null);
  const r = saveData(defaultData());
  assert.equal(r.ok, true, 'save must succeed after clearing recovery');
});

test('Successful import clears recovery', () => {
  // Arrange: start with a valid baseline in primary and a recovery present
  const base = defaultData();
  base.company.name = 'Base';
  saveData(base);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, '{"old":"backup"}');
  // Prepare an import payload
  const next = defaultData();
  next.company.name = 'Imported';
  const res = importJsonString(JSON.stringify(next));
  assert.equal(res.ok, true, 'import should succeed');
  // Recovery must be cleared on successful import
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), null);
});

