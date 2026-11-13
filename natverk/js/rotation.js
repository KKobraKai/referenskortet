export function isoWeek(date){
  // ISO week number: weeks start Monday; week 1 is the week with the first Thursday of the year.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year.
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(),0,4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const diff = d - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

export function pickNextWantedIndex(wantedAreas, usedIndexes, now=new Date()){
  const filled = wantedAreas
    .map((a,i)=>({i, has:Boolean(a && a.name && a.name.trim())}))
    .filter(x=>x.has)
    .map(x=>x.i);
  if(filled.length===0) return -1;
  const week = isoWeek(now);
  const start = week % filled.length;
  const used = new Set(usedIndexes || []);
  // try from start, wrapping, pick first unused; if all used, clear and pick by week modulo
  for(let k=0;k<filled.length;k++){
    const idx = filled[(start + k) % filled.length];
    if(!used.has(idx)) return idx;
  }
  // all used: suggest by modulo
  return filled[start];
}

export function summarizeAsk(areaName, who, why){
  const parts = [];
  if(areaName) parts.push(areaName);
  if(who) parts.push(who);
  if(why) parts.push(why);
  return parts.join(' – ');
}
