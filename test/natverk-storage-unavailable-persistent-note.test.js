import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';

test('2(b) storage-unavailable has its own persistent element that survives later statuses', async () => {
  // Simulate a browser environment with localStorage getter throwing and no Node process
  const htmlPath = path.join(process.cwd(), 'natverk/index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
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
  // Deny access
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get(){ throw new Error('denied'); }
  });
  // Resolve module paths before removing process
  const shimPath = path.join(process.cwd(), 'natverk/js/localStorageShim.js');
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  // Remove process so shim treats this as non-Node (no stub fallback)
  const savedProcess = globalThis.process;
  // eslint-disable-next-line no-undef
  globalThis.process = undefined;
  // Bind globals expected by app
  Object.assign(globalThis, { window, document, CustomEvent, Blob });
  // Import shim then app
  await import(url.pathToFileURL(shimPath).href + `?v=${Math.random()}`);
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  // Dedicated note must exist and mention the storage unavailability
  const note = document.getElementById('storage-note');
  assert.ok(note, 'persistent storage-unavailable element must exist');
  const txt = (note.textContent || '').toLowerCase();
  assert.ok(/not saved on this device|sparas inte på denna enhet/.test(txt), 'persistent note must explain storage unavailability');
  // Fire two other status updates; persistent note must still be present and unchanged
  window.dispatchEvent(new window.CustomEvent('natverk:storage-error', { detail: { error: 'quota exceeded' } }));
  window.dispatchEvent(new window.CustomEvent('natverk:import-archived-prev'));
  const still = document.getElementById('storage-note');
  assert.ok(still, 'persistent note must remain present');
  const stillTxt = (still.textContent || '').toLowerCase();
  assert.ok(/not saved on this device|sparas inte på denna enhet/.test(stillTxt), 'persistent note must still carry original message');
  // Restore process for later tests
  // eslint-disable-next-line no-undef
  globalThis.process = savedProcess;
});

