import { CONFIG } from './config.js';

function isString(x, maxLen) {
  if (typeof x !== 'string') return false;
  if (typeof maxLen === 'number' && x.length > maxLen) return false;
  return true;
}

function isIntIn(x, min, max) {
  return Number.isInteger(x) && x >= min && x <= max;
}

export function validateData(data) {
  const L = CONFIG.limits;
  if (!data || typeof data !== 'object') return { ok: false, error: 'Root not object' };
  if (!isIntIn(data.schemaVersion, CONFIG.schemaVersion, CONFIG.schemaVersion)) {
    return { ok: false, error: 'Unsupported schemaVersion' };
  }
  // Company
  if (!data.company || typeof data.company !== 'object') return { ok: false, error: 'company missing' };
  if (!isString(data.company.name, 120)) return { ok: false, error: 'company.name invalid' };
  if (!isString(data.company.desc, 300)) return { ok: false, error: 'company.desc invalid' };

  // Sides
  for (const side of ['current', 'wanted']) {
    const s = data[side];
    if (!s || typeof s !== 'object') return { ok: false, error: `${side} missing` };
    if (!Array.isArray(s.areas) || s.areas.length !== L.maxAreas) {
      return { ok: false, error: `${side}.areas length invalid` };
    }
    for (let i = 0; i < L.maxAreas; i++) {
      const a = s.areas[i];
      if (!a || typeof a !== 'object') return { ok: false, error: `${side}.areas[${i}] invalid` };
      if (!isString(a.name, 80)) return { ok: false, error: `${side}.areas[${i}].name invalid` };
      if (!Array.isArray(a.contacts) || a.contacts.length !== L.maxContactsPerArea) {
        return { ok: false, error: `${side}.areas[${i}].contacts length invalid` };
      }
      for (let j = 0; j < L.maxContactsPerArea; j++) {
        if (!isString(a.contacts[j], 100)) {
          return { ok: false, error: `${side}.areas[${i}].contacts[${j}] invalid` };
        }
      }
    }
    if (!Array.isArray(s.partners) || s.partners.length !== L.maxPartners) {
      return { ok: false, error: `${side}.partners length invalid` };
    }
    for (let i = 0; i < L.maxPartners; i++) {
      if (!isString(s.partners[i], 100)) {
        return { ok: false, error: `${side}.partners[${i}] invalid` };
      }
    }
  }

  // Weekly
  if (!data.weekly || typeof data.weekly !== 'object') return { ok: false, error: 'weekly missing' };
  if (!Array.isArray(data.weekly.usedAreaIndexes)) return { ok: false, error: 'weekly.usedAreaIndexes invalid' };
  for (const v of data.weekly.usedAreaIndexes) {
    if (!isIntIn(v, 0, L.maxAreas - 1)) return { ok: false, error: 'weekly.usedAreaIndexes value out of range' };
  }
  if (!Array.isArray(data.weekly.history)) return { ok: false, error: 'weekly.history invalid' };
  for (let k = 0; k < data.weekly.history.length; k++) {
    const h = data.weekly.history[k];
    if (!h || typeof h !== 'object') return { ok: false, error: `weekly.history[${k}] invalid` };
    if (!isIntIn(h.week, 1, 53)) return { ok: false, error: `weekly.history[${k}].week invalid` };
    if (!isIntIn(h.areaIndex, 0, L.maxAreas - 1)) return { ok: false, error: `weekly.history[${k}].areaIndex invalid` };
    if (!isString(h.who, 120)) return { ok: false, error: `weekly.history[${k}].who invalid` };
    if (!isString(h.why, 300)) return { ok: false, error: `weekly.history[${k}].why invalid` };
    if (!isString(h.short, 600)) return { ok: false, error: `weekly.history[${k}].short invalid` };
  }

  // 1-2-1s
  if (!Array.isArray(data.oneToOnes)) return { ok: false, error: 'oneToOnes invalid' };
  for (let i = 0; i < data.oneToOnes.length; i++) {
    const it = data.oneToOnes[i];
    if (!it || typeof it !== 'object') return { ok: false, error: `oneToOnes[${i}] invalid` };
    if (!isString(it.id, 200)) return { ok: false, error: `oneToOnes[${i}].id invalid` };
    if (!isString(it.who, 120)) return { ok: false, error: `oneToOnes[${i}].who invalid` };
    if (!isString(it.where, 120)) return { ok: false, error: `oneToOnes[${i}].where invalid` };
    if (!isString(it.time, 100)) return { ok: false, error: `oneToOnes[${i}].time invalid` };
    if (!isString(it.goals, 200)) return { ok: false, error: `oneToOnes[${i}].goals invalid` };
    if (!it.fields || typeof it.fields !== 'object') return { ok: false, error: `oneToOnes[${i}].fields invalid` };
    const fields = it.fields;
    const fieldKeys = ['vision', 'interests', 'networks', 'skills', 'projects', 'listen', 'intro', 'offer', 'next', 'nextmeet'];
    for (const key of fieldKeys) {
      if (!isString(fields[key], 600)) return { ok: false, error: `oneToOnes[${i}].fields.${key} invalid` };
    }
  }

  return { ok: true };
}

