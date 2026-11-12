import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { parseHTML } from 'linkedom';
import { CONFIG } from '../natverk/js/config.js';
import '../natverk/js/localStorageShim.js';
import { defaultData, loadData } from '../natverk/js/storage.js';

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

test('N2 reset: missing confirm => no reset (coded error shown)', async () => {
  // Seed corrupt primary and recovery
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  // Take byte snapshots
  const before = {
    data: globalThis.localStorage.getItem(CONFIG.storageKeys.data),
    recovery: globalThis.localStorage.getItem(CONFIG.storageKeys.recovery),
    recoveryPrev: globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev),
    dataPrev: globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev),
    dataPrev2: globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2)
  };
  const { window, document } = await bootDom();
  // Remove confirm so it is missing
  window.confirm = undefined;
  // Click Export-then-clear — should refuse with coded error
  const btn = document.getElementById('btn-export-then-clear');
  btn.click();
  // Data should remain corrupt after the attempted reset
  const re = loadData();
  assert.ok(re && typeof re === 'object', 'loadData still returns defaults when corrupt primary remains');
  // All slots must be byte-identical
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), before.data);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), before.recovery);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), before.recoveryPrev);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), before.dataPrev);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), before.dataPrev2);
  // Status should mention reset cancelled (translated key)
  const msg = document.querySelector('#status').textContent || '';
  assert.ok(/reset cancelled|återställning avbröts/i.test(msg), 'coded reset_cancelled should be shown');
});

test('N2 reset: throwing confirm => no reset (coded error shown)', async () => {
  // Seed corrupt primary and recovery
  const corrupt = '{"schemaVersion":1,';
  globalThis.localStorage.setItem(CONFIG.storageKeys.data, corrupt);
  globalThis.localStorage.setItem(CONFIG.storageKeys.recovery, corrupt);
  const before = {
    data: globalThis.localStorage.getItem(CONFIG.storageKeys.data),
    recovery: globalThis.localStorage.getItem(CONFIG.storageKeys.recovery),
    recoveryPrev: globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev),
    dataPrev: globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev),
    dataPrev2: globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2)
  };
  const { window, document } = await bootDom();
  // Throw from confirm
  window.confirm = ()=>{ throw new Error('blocked'); };
  const btn = document.getElementById('btn-export-then-clear');
  btn.click();
  // Data should remain corrupt after the attempted reset
  const re = loadData();
  assert.ok(re && typeof re === 'object', 'loadData still returns defaults when corrupt primary remains');
  // All slots must be byte-identical
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.data), before.data);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recovery), before.recovery);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.recoveryPrev), before.recoveryPrev);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev), before.dataPrev);
  assert.equal(globalThis.localStorage.getItem(CONFIG.storageKeys.dataPrev2), before.dataPrev2);
  // Status should mention reset cancelled (translated key)
  const msg = document.querySelector('#status').textContent || '';
  assert.ok(/reset cancelled|återställning avbröts/i.test(msg), 'coded reset_cancelled should be shown');
});

