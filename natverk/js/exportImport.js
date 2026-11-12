import { CONFIG } from './config.js';
import { loadData, saveData, defaultData } from './storage.js';
import { validateData } from './schema.js';
import { t } from './i18n.js';

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
    // Ask user to confirm a reset
    let confirmed = false;
    try{
      if (typeof window !== 'undefined' && window && typeof window.confirm === 'function') {
        confirmed = !!window.confirm(t('confirm_reset'));
      }
    }catch{}
    if (!confirmed) return { ok:false, code:'reset_cancelled' };
    // Replace primary with defaults explicitly allowed
    const r = saveData(defaultData(), { allowReplaceCorrupt: true });
    if (!r.ok) return r;
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
    // Snapshot originals
    let originalPrimary = null;
    let originalRecovery = null;
    let originalPrev = null;
    try { originalPrimary = localStorage.getItem(CONFIG.storageKeys.data); } catch {}
    try { originalPrev = localStorage.getItem(CONFIG.storageKeys.recoveryPrev); } catch {}
    // If a recovery is present, stage archive FIRST to a temp key with byte verification.
    let hadRecovery = false;
    let recoveryValue = null;
    try{
      recoveryValue = localStorage.getItem(CONFIG.storageKeys.recovery);
      originalRecovery = recoveryValue;
      hadRecovery = recoveryValue !== null;
    }catch{
      // Fail closed if reading recovery fails
      return { ok:false, code:'archive_failed' };
    }
    let movedPrev = false;
    if (hadRecovery) {
      try{
        localStorage.setItem(CONFIG.storageKeys.recoveryPrevTmp, recoveryValue);
        const tmp = localStorage.getItem(CONFIG.storageKeys.recoveryPrevTmp);
        if (tmp !== recoveryValue) return { ok:false, code:'archive_failed' };
      }catch{
        return { ok:false, code:'archive_failed' };
      }
    }
    // Save new data, explicitly allowed to replace corrupt
    const res = saveData(parsed, { allowReplaceCorrupt: true });
    if(!res.ok){
      try{ localStorage.removeItem(CONFIG.storageKeys.recoveryPrevTmp); }catch{}
      return { ok:false, code:'import_storage_failed' };
    }
    // Promote archive and clear current recovery; on failure, roll back to originalPrimary and originalPrev
    if (hadRecovery) {
      try{
        localStorage.setItem(CONFIG.storageKeys.recoveryPrev, recoveryValue);
        localStorage.removeItem(CONFIG.storageKeys.recoveryPrevTmp);
        localStorage.removeItem(CONFIG.storageKeys.recovery);
        movedPrev = true;
      }catch(e){
        // Roll back primary and prev to original state
        try{
          if (originalPrimary !== null) {
            localStorage.setItem(CONFIG.storageKeys.data, originalPrimary);
          } else {
            localStorage.removeItem(CONFIG.storageKeys.data);
          }
        }catch{}
        try{
          if (originalPrev !== null) {
            localStorage.setItem(CONFIG.storageKeys.recoveryPrev, originalPrev);
          } else {
            localStorage.removeItem(CONFIG.storageKeys.recoveryPrev);
          }
        }catch{}
        try{ localStorage.removeItem(CONFIG.storageKeys.recoveryPrevTmp); }catch{}
        return { ok:false, code:'promotion_failed' };
      }
    } else {
      // No recovery present — ensure any temp is cleared defensively
      try{ localStorage.removeItem(CONFIG.storageKeys.recoveryPrevTmp); }catch{}
    }
    try{
      if (movedPrev && typeof window !== 'undefined' && window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('natverk:import-archived-prev'));
      }
    }catch{}
    return { ok:true, movedPrev }
  }catch(e){
    return { ok:false, code:'import_malformed' };
  }
}

// no export of internal validators here; use schema.js
