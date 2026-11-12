import './localStorageShim.js';
import { CONFIG } from './config.js';
import { validateData } from './schema.js';

export function defaultData(){
  const limits = CONFIG.limits;
  return {
    schemaVersion: CONFIG.schemaVersion,
    company: { name: '', desc: '' },
    current: {
      areas: Array.from({length: limits.maxAreas}, ()=>({ name:'', contacts: Array.from({length: limits.maxContactsPerArea}, ()=>'' ) })),
      partners: Array.from({length: limits.maxPartners}, ()=>'' )
    },
    wanted: {
      areas: Array.from({length: limits.maxAreas}, ()=>({ name:'', contacts: Array.from({length: limits.maxContactsPerArea}, ()=>'' ) })),
      partners: Array.from({length: limits.maxPartners}, ()=>'' )
    },
    weekly: {
      usedAreaIndexes: [], // indices into wanted.areas
      history: [] // { week, areaIndex, who, why, short }
    },
    oneToOnes: [] // { id, who, where, time, goals, fields: {...}, summary }
  };
}

export function loadData(){
  try{
    let raw = null;
    try { raw = localStorage.getItem(CONFIG.storageKeys.data); } catch { raw = null; }
    if(!raw) return defaultData();
    const data = JSON.parse(raw);
    const v = validateData(data);
    if(!v.ok) {
      // Preserve raw as recovery; dispatch event to inform UI
      try {
        const existing = localStorage.getItem(CONFIG.storageKeys.recovery);
        if (!existing) localStorage.setItem(CONFIG.storageKeys.recovery, raw);
      }catch{}
      try{
        if (typeof window !== 'undefined' && window && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('natverk:data-invalid', { detail: { error: v.error || 'invalid' } }));
        }
      }catch{}
      return defaultData();
    }
    return migrateIfNeeded(data);
  }catch(e){
    // JSON.parse failed or other error — preserve raw if present
    try{
      const existing = localStorage.getItem(CONFIG.storageKeys.recovery);
      if (!existing) {
        // Use the last-read raw string if available; otherwise re-read
        let toSave = typeof raw === 'string' ? raw : null;
        if (toSave === null) {
          try { toSave = localStorage.getItem(CONFIG.storageKeys.data); } catch { toSave = null; }
        }
        if (toSave !== null) localStorage.setItem(CONFIG.storageKeys.recovery, toSave);
      }
    }catch{}
    return defaultData();
  }
}

export function saveData(data){
  const copy = structuredClone(data);
  try{
    // If corrupt raw exists in primary and no confirmed recovery, block saving
    try{
      const raw = localStorage.getItem(CONFIG.storageKeys.data);
      if (typeof raw === 'string') {
        let parsedOk = true;
        try{ JSON.parse(raw); }catch{ parsedOk = false; }
        if (!parsedOk) {
          const rec = localStorage.getItem(CONFIG.storageKeys.recovery);
          if (!rec || rec !== raw) {
            try{
              if (typeof window !== 'undefined' && window && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('natverk:data-invalid', { detail: { error: 'recovery_unconfirmed' } }));
              }
            }catch{}
            return { ok:false, code:'recovery_unconfirmed' };
          }
        }
      }
    }catch{}
    // If recovery exists, refuse to overwrite primary until user resolves
    try{
      const rec = localStorage.getItem(CONFIG.storageKeys.recovery);
      if (rec) {
        return { ok:false, code:'recovery_present' };
      }
    }catch{}
    localStorage.setItem(CONFIG.storageKeys.data, JSON.stringify(copy));
    return { ok:true };
  }catch(e){
    // Notify UI if available
    try{
      if (typeof window !== 'undefined' && window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('natverk:storage-error', { detail: { error: String(e && e.message || e) } }));
      }
    }catch{}
    const detail = String(e && e.message || e);
    return { ok:false, code:'storage_error', detail, error: detail };
  }
}

export function validateDataShape(obj){
  // Backward compat no-op; delegate to validateData
  return validateData(obj).ok;
}

export function migrateIfNeeded(data){
  // For future schema upgrades
  return data;
}

export function canUseStorage(){
  try{
    const k = '__natverk_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  }catch{
    return false;
  }
}

export function hasRecovery(){
  try{
    return !!localStorage.getItem(CONFIG.storageKeys.recovery);
  }catch{
    return false;
  }
}

export function hasRecoveryPrev(){
  try{
    return !!localStorage.getItem(CONFIG.storageKeys.recoveryPrev);
  }catch{
    return false;
  }
}
