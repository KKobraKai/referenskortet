export function validate121(entry){
  function isStr(s, max){ return typeof s === 'string' && s.length <= max; }
  if(!isStr(entry.who||'', 120)) return { ok:false, code:'err_who_too_long' };
  if(!isStr(entry.where||'', 120)) return { ok:false, code:'err_where_too_long' };
  if(!isStr(entry.time||'', 100)) return { ok:false, code:'err_time_too_long' };
  if(!isStr(entry.goals||'', 200)) return { ok:false, code:'err_goals_too_long' };
  const f = entry.fields || {};
  const keys = ['vision','interests','networks','skills','projects','listen','intro','offer','next','nextmeet'];
  for (const k of keys){
    if(!isStr(f[k]||'', 600)) return { ok:false, code:`err_${k}_too_long` };
  }
  return { ok:true };
}
