import { CONFIG } from './config.js';
import { loadData, saveData, defaultData } from './storage.js';
import { validateData } from './schema.js';
import { t } from './i18n.js';
import { safeReadSlot } from './storageOps.js';

function rotateArchivePrimaryOrFail(){
  // Bounded rotation: tmp <- primary (verify), prev2 <- prev, prev <- tmp
  // On any failure, do not modify any slot and return coded error
  const pr = safeReadSlot(CONFIG.storageKeys.data);
  if (!pr.ok) return { ok:false, code:'primary_read_failed' };
  const primaryStr = pr.value;
  if (primaryStr === null) {
    const p1 = safeReadSlot(CONFIG.storageKeys.dataPrev);
    if (!p1.ok) return { ok:false, code:'rotation_failed' };
    const p2 = safeReadSlot(CONFIG.storageKeys.dataPrev2);
    if (!p2.ok) return { ok:false, code:'rotation_failed' };
    return { ok:true, origPrev1: p1.value, origPrev2: p2.value };
  }
  let origPrev1 = null, origPrev2 = null;
  {
    const r1 = safeReadSlot(CONFIG.storageKeys.dataPrev);
    if (!r1.ok) return { ok:false, code:'rotation_failed' };
    origPrev1 = r1.value;
  }
  {
    const r2 = safeReadSlot(CONFIG.storageKeys.dataPrev2);
    if (!r2.ok) return { ok:false, code:'rotation_failed' };
    origPrev2 = r2.value;
  }
  // Stage tmp with verify
  try{
    localStorage.setItem(CONFIG.storageKeys.dataPrevTmp, primaryStr);
    const tmp = localStorage.getItem(CONFIG.storageKeys.dataPrevTmp);
    if (tmp !== primaryStr) { try{ localStorage.removeItem(CONFIG.storageKeys.dataPrevTmp); }catch{}; return { ok:false, code:'primary_archive_failed' }; }
  }catch{
    return { ok:false, code:'primary_archive_failed' };
  }
  // Shift prev -> prev2
  try{
    if (origPrev1 !== null) {
      localStorage.setItem(CONFIG.storageKeys.dataPrev2, origPrev1);
      const v = localStorage.getItem(CONFIG.storageKeys.dataPrev2);
      if (v !== origPrev1) { throw new Error('mismatch'); }
    } else {
      // No previous prev — clear prev2 if existed
      localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
    }
  }catch{
    // Attempt to restore prev2 to its original state
    try{
      if (origPrev2 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev2, origPrev2);
      else localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
    }catch{}
    try{ localStorage.removeItem(CONFIG.storageKeys.dataPrevTmp); }catch{}
    return { ok:false, code:'rotation_failed' };
  }
  // Promote tmp -> prev
  try{
    localStorage.setItem(CONFIG.storageKeys.dataPrev, primaryStr);
    const check = localStorage.getItem(CONFIG.storageKeys.dataPrev);
    if (check !== primaryStr) throw new Error('mismatch');
  }catch{
    // Roll back prev2 to original value
    try{
      if (origPrev2 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev2, origPrev2);
      else localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
    }catch{}
    // Roll back prev to original value
    try{
      if (origPrev1 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev, origPrev1);
      else localStorage.removeItem(CONFIG.storageKeys.dataPrev);
    }catch{}
    try{ localStorage.removeItem(CONFIG.storageKeys.dataPrevTmp); }catch{}
    return { ok:false, code:'rotation_failed' };
  }
  try{ localStorage.removeItem(CONFIG.storageKeys.dataPrevTmp); }catch{}
  return { ok:true, origPrev1, origPrev2 };
}

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
    // Rotate-archive primary before replacing it
    const orig = rotateArchivePrimaryOrFail();
    if (!orig.ok) return orig;
    // Replace primary with defaults explicitly allowed
    const r = saveData(defaultData(), { allowReplaceCorrupt: true });
    if (!r.ok) {
      // Roll back prev/prev2 to originals
      try{
        if (orig.origPrev1 !== undefined) {
          if (orig.origPrev1 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev, orig.origPrev1);
          else localStorage.removeItem(CONFIG.storageKeys.dataPrev);
        }
        if (orig.origPrev2 !== undefined) {
          if (orig.origPrev2 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev2, orig.origPrev2);
          else localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
        }
      }catch{}
      return r;
    }
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
    // Rotate-archive primary before any allowReplaceCorrupt write
    const orig = rotateArchivePrimaryOrFail();
    if (!orig.ok) {
      // Clean up staged recovery tmp if present
      try{ localStorage.removeItem(CONFIG.storageKeys.recoveryPrevTmp); }catch{}
      return orig;
    }
    // Save new data, explicitly allowed to replace corrupt
    const res = saveData(parsed, { allowReplaceCorrupt: true });
    if(!res.ok){
      // Roll back prev/prev2 to originals
      try{
        if (orig.origPrev1 !== undefined) {
          if (orig.origPrev1 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev, orig.origPrev1);
          else localStorage.removeItem(CONFIG.storageKeys.dataPrev);
        }
        if (orig.origPrev2 !== undefined) {
          if (orig.origPrev2 !== null) localStorage.setItem(CONFIG.storageKeys.dataPrev2, orig.origPrev2);
          else localStorage.removeItem(CONFIG.storageKeys.dataPrev2);
        }
      }catch{}
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
        // Roll back primary, prev, and recovery to original state
        let rollbackError = false;
        try{
          if (originalPrimary !== null) {
            localStorage.setItem(CONFIG.storageKeys.data, originalPrimary);
          } else {
            localStorage.removeItem(CONFIG.storageKeys.data);
          }
        }catch{ rollbackError = true; }
        try{
          if (originalPrev !== null) {
            localStorage.setItem(CONFIG.storageKeys.recoveryPrev, originalPrev);
          } else {
            localStorage.removeItem(CONFIG.storageKeys.recoveryPrev);
          }
        }catch{ rollbackError = true; }
        try{
          if (originalRecovery !== null) {
            localStorage.setItem(CONFIG.storageKeys.recovery, originalRecovery);
          } else {
            localStorage.removeItem(CONFIG.storageKeys.recovery);
          }
        }catch{ rollbackError = true; }
        try{ localStorage.removeItem(CONFIG.storageKeys.recoveryPrevTmp); }catch{}
        return { ok:false, code: rollbackError ? 'rollback_failed' : 'promotion_failed' };
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
