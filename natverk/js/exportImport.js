import { CONFIG } from './config.js';
import { loadData, saveData } from './storage.js';
import { validateData } from './schema.js';

export function exportJson(){
  const data = loadData();
  const json = JSON.stringify(data, null, 2);
  return { json, blob: new Blob([json], { type:'application/json' }) };
}

export function exportRecoveryJson(){
  try{
    const raw = localStorage.getItem(CONFIG.storageKeys.recovery);
    if(!raw) return { ok:false, code:'no_backup' };
    const blob = new Blob([raw], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'natverk-data-recovery.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    return { ok:true };
  }catch(e){
    return { ok:false, code:'export_failed' };
  }
}

export function exportAndClearRecovery(){
  try{
    const res = exportRecoveryJson();
    if(!res.ok) return res;
    try { localStorage.removeItem(CONFIG.storageKeys.recovery); } catch {}
    return { ok:true };
  }catch{
    return { ok:false, code:'export_failed' };
  }
}

export function downloadJson(filename = 'natverk-data.json'){
  const { blob } = exportJson();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importJsonFile(file){
  const text = await file.text();
  return importJsonString(text);
}

export function importJsonString(text){
  try{
    const parsed = JSON.parse(text);
    const v = validateData(parsed);
    if(!v.ok){
      if(v.error === 'Unsupported schemaVersion') return { ok:false, code:'import_unsupported_schema' };
      return { ok:false, code:'import_invalid_structure' };
    }
    // If a recovery is present, resolve it on import: clear before saving,
    // restore only if the save fails.
    let hadRecovery = false;
    let recoveryValue = null;
    try{
      recoveryValue = localStorage.getItem(CONFIG.storageKeys.recovery);
      hadRecovery = !!recoveryValue;
      if (hadRecovery) localStorage.removeItem(CONFIG.storageKeys.recovery);
    }catch{}
    const res = saveData(parsed);
    if(!res.ok){
      // restore recovery if we cleared it
      if (hadRecovery) {
        try{ localStorage.setItem(CONFIG.storageKeys.recovery, recoveryValue); }catch{}
      }
      return { ok:false, code:'import_storage_failed' };
    }
    // Success: recovery stays cleared (if it existed)
    return { ok:true }
  }catch(e){
    return { ok:false, code:'import_malformed' };
  }
}

// no export of internal validators here; use schema.js
