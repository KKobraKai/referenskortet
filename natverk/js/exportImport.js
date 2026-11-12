import { CONFIG } from './config.js';
import { loadData, saveData } from './storage.js';
import { validateData } from './schema.js';

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
    const v = validateData(parsed);
    if(!v.ok){
      if(v.error === 'Unsupported schemaVersion') return { ok:false, error:'Unsupported schemaVersion' };
      return { ok:false, error:'Invalid JSON structure' };
    }
    const res = saveData(parsed);
    if(!res.ok){
      return { ok:false, error:'Storage write failed' };
    }
    return { ok:true }
  }catch(e){
    return { ok:false, error:'Malformed JSON' };
  }
}

// no export of internal validators here; use schema.js
