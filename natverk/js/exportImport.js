import { CONFIG } from './config.js';
import { loadData, saveData, validateDataShape } from './storage.js';

export function exportJson(){
  const data = loadData();
  const json = JSON.stringify(data, null, 2);
  return { json, blob: new Blob([json], { type:'application/json' }) };
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
    if(!validateDataShape(parsed)) return { ok:false, error:'Invalid JSON structure' };
    if(parsed.schemaVersion !== CONFIG.schemaVersion) return { ok:false, error:'Unsupported schemaVersion' };
    // Enforce limits and strings only
    if(!enforceLimitsAndTypes(parsed)) return { ok:false, error:'Values exceed limits' };
    saveData(parsed);
    return { ok:true };
  }catch(e){
    return { ok:false, error:'Malformed JSON' };
  }
}

function enforceLimitsAndTypes(data){
  const L = CONFIG.limits;
  for(const side of ['current','wanted']){
    if(data[side].areas.length !== L.maxAreas) return false;
    if(data[side].partners.length !== L.maxPartners) return false;
    for(const a of data[side].areas){
      if(typeof a.name!=='string') return false;
      if(!Array.isArray(a.contacts) || a.contacts.length !== L.maxContactsPerArea) return false;
      for(const c of a.contacts){ if(typeof c!=='string') return false; }
    }
    for(const p of data[side].partners){ if(typeof p!=='string') return false; }
  }
  if(!Array.isArray(data.weekly.usedAreaIndexes)) return false;
  if(!Array.isArray(data.weekly.history)) return false;
  if(!Array.isArray(data.oneToOnes)) return false;
  return true;
}
