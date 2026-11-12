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

test('status messages are translated: EN mode', async () => {
  const { window, document } = await bootAppDom('en');
  // Trigger a storage error event
  window.dispatchEvent(new window.CustomEvent('natverk:storage-error', { detail: { error: 'quota exceeded' } }));
  const msg1 = document.querySelector('#status').textContent || '';
  assert.match(msg1, /Storage error/i);
  // Trigger a validate121 failure
  document.querySelector('#one-who').value = 'x'.repeat(121); // >120
  document.querySelector('#btn-save-121').click();
  const msg2 = document.querySelector('#status').textContent || '';
  assert.match(msg2, /Could not save/i);
  // Must not leak raw validator English like 'who too long'
  assert.ok(!/who too long/.test(msg2), 'validator message must be translated, not raw');
});

test('status messages are translated: SV mode', async () => {
  const { window, document } = await bootAppDom('sv');
  // Ensure the UI switches to sv by simulating a change event
  const sel = document.getElementById('lang-select');
  if (sel) {
    sel.value = 'sv';
    sel.dispatchEvent(new window.Event('change'));
  }
  // Trigger a storage error event
  window.dispatchEvent(new window.CustomEvent('natverk:storage-error', { detail: { error: 'quota exceeded' } }));
  const msg1 = document.querySelector('#status').textContent || '';
  assert.match(msg1, /Lagringsfel/i);
  // Trigger a validate121 failure
  document.querySelector('#one-who').value = 'x'.repeat(121); // >120
  document.querySelector('#btn-save-121').click();
  const msg2 = document.querySelector('#status').textContent || '';
  assert.match(msg2, /Kunde inte spara/i);
  // Must be Swedish (not the raw English 'who too long')
  assert.ok(!/who too long/.test(msg2), 'Swedish mode must not show English raw text');
});

