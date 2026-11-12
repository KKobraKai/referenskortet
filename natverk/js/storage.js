import './localStorageShim.js';
import { CONFIG } from './config.js';

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
    const raw = localStorage.getItem(CONFIG.storageKeys.data);
    if(!raw) return defaultData();
    const data = JSON.parse(raw);
    if(!validateDataShape(data)) return defaultData();
    return migrateIfNeeded(data);
  }catch{
    return defaultData();
  }
}

export function saveData(data){
  const copy = structuredClone(data);
  localStorage.setItem(CONFIG.storageKeys.data, JSON.stringify(copy));
}

export function validateDataShape(obj){
  if(!obj || typeof obj!=='object') return false;
  if(typeof obj.schemaVersion!=='number') return false;
  if(!obj.company || typeof obj.company.name!=='string' || typeof obj.company.desc!=='string') return false;
  for (const side of ['current','wanted']){
    if(!obj[side] || !Array.isArray(obj[side].areas) || !Array.isArray(obj[side].partners)) return false;
  }
  if(!obj.weekly || !Array.isArray(obj.weekly.usedAreaIndexes) || !Array.isArray(obj.weekly.history)) return false;
  if(!Array.isArray(obj.oneToOnes)) return false;
  return true;
}

export function migrateIfNeeded(data){
  // For future schema upgrades
  return data;
}
