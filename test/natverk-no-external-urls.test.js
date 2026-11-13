import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.join(process.cwd(), 'natverk');

function findHttpUrls(text){
  const matches = [];
  const re = /\bhttps?:\/\/[^\s"'<>)]+/g;
  let m; while((m=re.exec(text))){ matches.push(m[0]); }
  return matches;
}

test('no external URLs except allowed outbound hosts', () => {
  const allowedHostSuffixes = ['bniconnectglobal.com'];
  const files = [];
  function walk(dir){
    for(const name of fs.readdirSync(dir)){
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if(st.isDirectory()) walk(p);
      else if(/\.(html|css|js|json)$/.test(name)) files.push(p);
    }
  }
  walk(root);
  const offenders = [];
  for(const f of files){
    const text = fs.readFileSync(f, 'utf-8');
    const urls = findHttpUrls(text);
    for(const u of urls){
      try{
        const h = new URL(u).hostname;
        const allowed = allowedHostSuffixes.some(suf => h === suf || h.endsWith('.'+suf));
        if(!allowed){ offenders.push({ file:f, url:u }); }
      }catch{
        offenders.push({ file:f, url:u });
      }
    }
  }
  assert.deepEqual(offenders, []);
});
