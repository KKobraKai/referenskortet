// Minimal helper for safe localStorage reads.
// Returns { ok: true, value: string|null } on success, or { ok:false } on exception.
export function safeReadSlot(key){
  try{
    return { ok:true, value: localStorage.getItem(key) };
  }catch{
    return { ok:false };
  }
}

import { CONFIG } from './config.js';
import { I18N } from './i18n.js';

export function slotInfoFor(key){
  const map = {
    [CONFIG.storageKeys.data]: 'slot_primary',
    [CONFIG.storageKeys.recovery]: 'slot_recovery',
    [CONFIG.storageKeys.recoveryPrev]: 'slot_recovery_prev',
    [CONFIG.storageKeys.dataPrev]: 'slot_data_prev',
    [CONFIG.storageKeys.dataPrev2]: 'slot_data_prev_2'
  };
  const k = map[key] || key;
  return { key: k, sv: (I18N.sv && I18N.sv[k]) || k, en: (I18N.en && I18N.en[k]) || k };
}

// Attempts every restore independently, newest first.
// steps: Array<{ key: string, value: string|null }>
// Returns { ok:true } or { ok:false, code:'rollback_failed', slots:[{key,sv,en}, ...] }
export function restoreAll(steps){
  const failed = [];
  for (const { key, value } of steps) {
    try{
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }catch{
      failed.push(slotInfoFor(key));
    }
  }
  if (failed.length) return { ok:false, code:'rollback_failed', slots: failed };
  return { ok:true };
}

