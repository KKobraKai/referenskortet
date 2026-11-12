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

export function exportRecoveryPrevJson(){
  try{
    const raw = localStorage.getItem(CONFIG.storageKeys.recoveryPrev);
    if(!raw) return { ok:false, code:'no_backup' };
    const blob = new Blob([raw], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'natverk-data-recovery-prev.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
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
    // If a recovery is present, archive it on successful import
    let hadRecovery = false;
    let recoveryValue = null;
    try{
      recoveryValue = localStorage.getItem(CONFIG.storageKeys.recovery);
      hadRecovery = !!recoveryValue;
    }catch{}
    // Temporarily clear recovery to allow save; restore on failure; archive on success
    let tempCleared = false;
    if (hadRecovery) {
      try { localStorage.removeItem(CONFIG.storageKeys.recovery); tempCleared = true; } catch {}
    }
    const res = saveData(parsed);
    if(!res.ok){
      // restore recovery if we had cleared it
      if (hadRecovery && tempCleared) {
        try{ localStorage.setItem(CONFIG.storageKeys.recovery, recoveryValue); }catch{}
      }
      return { ok:false, code:'import_storage_failed' };
    }
    // Success: if there was a recovery, move it to archive slot then clear current
    let movedPrev = false;
    if (hadRecovery) {
      try{
        localStorage.setItem(CONFIG.storageKeys.recoveryPrev, recoveryValue);
        localStorage.removeItem(CONFIG.storageKeys.recovery);
        movedPrev = true;
        if (typeof window !== 'undefined' && window && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('natverk:import-archived-prev'));
        }
      }catch{}
    }
    return { ok:true, movedPrev }
  }catch(e){
    return { ok:false, code:'import_malformed' };
  }
}

// no export of internal validators here; use schema.js
