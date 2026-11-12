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
    if(!v.ok) return defaultData();
    return migrateIfNeeded(data);
  }catch{
    return defaultData();
  }
}

export function saveData(data){
  const copy = structuredClone(data);
  try{
    localStorage.setItem(CONFIG.storageKeys.data, JSON.stringify(copy));
    return { ok:true };
  }catch(e){
    // Notify UI if available
    try{
      if (typeof window !== 'undefined' && window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('natverk:storage-error', { detail: { error: String(e && e.message || e) } }));
      }
    }catch{}
    return { ok:false, error: String(e && e.message || e) };
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
