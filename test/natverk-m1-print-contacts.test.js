import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import '../natverk/js/localStorageShim.js';
import { defaultData, saveData } from '../natverk/js/storage.js';

test('M1 print summary includes area contacts at print time', async () => {
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
  const appPath = path.join(process.cwd(), 'natverk/js/app.js');
  await import(url.pathToFileURL(appPath).href + `?v=${Math.random()}`);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  // Seed via UI inputs to update app state
  const wantedContainer = document.querySelector('#wanted-areas');
  // Area name input is the first input inside .area
  const nameInput = wantedContainer.querySelector('.area input');
  nameInput.value = 'Retail';
  nameInput.dispatchEvent(new window.Event('input'));
  const contactInputs = wantedContainer.querySelectorAll('.slots .slot input');
  contactInputs[0].value = 'Alice';
  contactInputs[0].dispatchEvent(new window.Event('input'));
  contactInputs[1].value = 'Bob';
  contactInputs[1].dispatchEvent(new window.Event('input'));
  // Trigger print
  const btn = document.querySelector('#btn-print-m1');
  let printed = false;
  window.print = ()=>{ printed = true; };
  btn.click();
  assert.equal(printed, true);
  const text = document.querySelector('#tree-summary').textContent || '';
  assert.match(text, /Alice/);
  assert.match(text, /Bob/);
});

