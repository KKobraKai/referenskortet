import { CONFIG } from './config.js';

export function setCompany(data, name, desc){
  data.company.name = sanitizeText(name, 120);
  data.company.desc = sanitizeText(desc, 300);
}

export function setAreaName(data, side, index, name){
  const limits = CONFIG.limits;
  if(index<0 || index>=limits.maxAreas) return false;
  data[side].areas[index].name = sanitizeText(name, 80);
  return true;
}

export function setAreaContact(data, side, areaIndex, contactIndex, value){
  const L = CONFIG.limits;
  if(areaIndex<0 || areaIndex>=L.maxAreas) return false;
  if(contactIndex<0 || contactIndex>=L.maxContactsPerArea) return false;
  data[side].areas[areaIndex].contacts[contactIndex] = sanitizeText(value, 100);
  return true;
}

export function setPartner(data, side, index, name){
  const L = CONFIG.limits;
  if(index<0 || index>=L.maxPartners) return false;
  data[side].partners[index] = sanitizeText(name, 100);
  return true;
}

export function computeGaps(data){
  const L = CONFIG.limits;
  const gaps = {
    wantedAreas: 0,
    wantedContacts: 0,
    wantedPartners: 0,
    currentAreas: 0,
    currentContacts: 0,
    currentPartners: 0
  };
  for(const side of ['wanted','current']){
    const areas = data[side].areas;
    for(let i=0;i<L.maxAreas;i++){
      if(!areas[i].name) gaps[side+'Areas']++;
      for(let j=0;j<L.maxContactsPerArea;j++){
        if(!areas[i].contacts[j]) gaps[side+'Contacts']++;
      }
    }
    const partners = data[side].partners;
    for(let i=0;i<L.maxPartners;i++){
      if(!partners[i]) gaps[side+'Partners']++;
    }
  }
  return gaps;
}

export function sanitizeText(s, maxLen){
  if(typeof s !== 'string') s = '';
  let out = s.replace(/\s+/g, ' ').trim();
  if(out.length>maxLen) out = out.slice(0,maxLen);
  return out;
}

export function canAddArea(currentAreas){
  // Return false if already at max non-empty area names
  const L = CONFIG.limits;
  const named = currentAreas.filter(a=>a.name && a.name.trim()).length;
  return named < L.maxAreas;
}

export function canAddContact(contactsArray){
  const L = CONFIG.limits;
  const filled = contactsArray.filter(v=>v && v.trim()).length;
  return filled < L.maxContactsPerArea;
}
