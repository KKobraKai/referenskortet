import { CONFIG, enabledModules } from './config.js';
import { I18N, t, getLang, setLang, applyI18n } from './i18n.js';
import { defaultData, loadData, saveData, canUseStorage, hasRecovery } from './storage.js';
import { setCompany, setAreaName, setAreaContact, setPartner, computeGaps } from './model.js';
import { isoWeek, pickNextWantedIndex, summarizeAsk } from './rotation.js';
import { downloadJson, importJsonFile, exportRecoveryJson } from './exportImport.js';
import { validate121 } from './validate.js';

const state = {
  data: defaultData()
};

function qs(sel){ return document.querySelector(sel); }
function ce(tag, cls){ const el = document.createElement(tag); if(cls) el.className=cls; return el; }

function showStatus(msg, isError=true){
  const el = qs('#status'); if(!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? 'var(--danger)' : 'var(--accent-2)';
}

function render(){
  const d = state.data;
  // Company
  qs('#companyName').value = d.company.name;
  qs('#companyDesc').value = d.company.desc;

  renderSide('wanted', '#wanted-areas', '#wanted-partners');
  renderSide('current', '#current-areas', '#current-partners');

  updateGaps();

  // Weekly ask panel
  renderWeekly();

  // Saved 1-2-1s
  renderOneList();
  // Summaries for print
  renderTreeSummary();
}

function updateGaps(){
  const d = state.data;
  const gaps = computeGaps(d);
  const gapsEl = qs('#gaps-summary');
  gapsEl.innerHTML = '';
  const items = [
    ['wantedAreas', t('gaps_wanted_areas')],
    ['wantedContacts', t('gaps_wanted_contacts')],
    ['wantedPartners', t('gaps_wanted_partners')],
    ['currentAreas', t('gaps_current_areas')],
    ['currentContacts', t('gaps_current_contacts')],
    ['currentPartners', t('gaps_current_partners')],
  ];
  for(const [k,label] of items){
    const b = ce('span','badge'); b.textContent = `${label}: ${gaps[k]}`;
    gapsEl.appendChild(b);
  }
}

function renderSide(side, areasSel, partnersSel){
  const limits = CONFIG.limits;
  const d = state.data[side];
  const container = qs(areasSel);
  container.innerHTML = '';
  for(let i=0;i<limits.maxAreas;i++){
    const a = d.areas[i];
    const card = ce('div','area');
    const h = ce('h3'); h.textContent = `${i+1}. ${t('area_name')}`;
    const name = ce('input'); name.value = a.name; name.maxLength=80; name.setAttribute('aria-label', `${t('area_name')} ${i+1}`);
    name.addEventListener('input', ()=>{
      setAreaName(state.data, side, i, name.value);
      const res = saveData(state.data); if(!res.ok) showStatus(t('not_saved')+': '+res.error, true);
      renderWeekly(); updateGaps();
    });
    card.appendChild(h); card.appendChild(name);
    const slots = ce('div','slots');
    for(let j=0;j<limits.maxContactsPerArea;j++){
      const row = ce('div','slot');
      const num = ce('span','num'); num.textContent = j+1;
      const inp = ce('input'); inp.value = a.contacts[j]; inp.maxLength=100;
      inp.setAttribute('aria-label', `${t('contact_n')} ${j+1} (${i+1})`);
      inp.addEventListener('input', ()=>{
        setAreaContact(state.data, side, i, j, inp.value);
        const res = saveData(state.data); if(!res.ok) showStatus(t('not_saved')+': '+res.error, true);
        updateGaps();
      });
      row.appendChild(num); row.appendChild(inp);
      slots.appendChild(row);
    }
    card.appendChild(slots);
    container.appendChild(card);
  }
  // Partners
  const part = qs(partnersSel);
  part.innerHTML = '';
  for(let i=0;i<limits.maxPartners;i++){
    const row = ce('div','slot');
    const num = ce('span','num'); num.textContent = i+1;
    const inp = ce('input'); inp.value = d.partners[i]; inp.maxLength=100;
    inp.setAttribute('aria-label', `${t('partner_n')} ${i+1}`);
    inp.addEventListener('input', ()=>{
      setPartner(state.data, side, i, inp.value);
      const res = saveData(state.data); if(!res.ok) showStatus(t('not_saved')+': '+res.error, true);
      updateGaps();
    });
    row.appendChild(num); row.appendChild(inp);
    part.appendChild(row);
  }
}

function renderWeekly(){
  const d = state.data;
  const week = isoWeek(new Date());
  const idx = pickNextWantedIndex(d.wanted.areas, d.weekly.usedAreaIndexes, new Date());
  const hint = qs('#rotation-hint');
  const areas = d.wanted.areas.map(a=>a.name).filter(Boolean);
  if(idx===-1 || areas.length===0){
    hint.textContent = '';
  }else{
    const name = d.wanted.areas[idx].name || '';
    hint.textContent = t('weekly_suggestion', { week, name });
  }
  // dropdown of non-empty wanted areas
  const sel = qs('#ask-branch');
  const prev = sel.value;
  sel.innerHTML = '';
  // Placeholder
  const ph = ce('option'); ph.value=''; ph.textContent = t('select_branch_placeholder'); ph.disabled = true; ph.selected = true;
  sel.appendChild(ph);
  d.wanted.areas.forEach((a,i)=>{
    if(a.name && a.name.trim()){
      const opt = ce('option'); opt.value = String(i); opt.textContent = a.name;
      if(String(i)===String(prev) || i===idx) { ph.selected = false; opt.selected = true; }
      sel.appendChild(opt);
    }
  });
  updateShortAsk();
  renderAskHistory();
}

function updateShortAsk(){
  const sel = qs('#ask-branch');
  const i = sel.value==='' ? -1 : Number(sel.value);
  const name = (Number.isInteger(i) && state.data.wanted.areas[i]) ? state.data.wanted.areas[i].name : '';
  const who = qs('#ask-who').value.trim();
  const why = qs('#ask-why').value.trim();
  const short = summarizeAsk(name, who, why);
  qs('#ask-short').textContent = short;
  const words = short.split(/\s+/).filter(Boolean).length;
  qs('#spoken-hint').textContent = t('word_count', { words });
}

function renderAskHistory(){
  const ul = qs('#ask-history'); if(!ul) return;
  ul.innerHTML = '';
  for(const h of state.data.weekly.history){
    const li = ce('li');
    li.textContent = `${t('week_prefix')}${h.week} — ${h.short}`;
    ul.appendChild(li);
  }
}

function renderOneList(){
  const ul = qs('#one-list');
  ul.innerHTML = '';
  for(const item of state.data.oneToOnes){
    const li = ce('li');
    const left = ce('div');
    left.textContent = `${item.who || ''} — ${new Date(item.time||Date.now()).toLocaleString()}`;
    const open = ce('button','btn'); open.textContent = t('open');
    open.addEventListener('click', ()=>{
      // load into form
      qs('#one-who').value = item.who || '';
      qs('#one-where').value = item.where || '';
      qs('#one-time').value = item.time || '';
      qs('#one-goals').value = item.goals || '';
      qs('#ag-vision').value = item.fields.vision || '';
      qs('#ag-interests').value = item.fields.interests || '';
      qs('#ag-networks').value = item.fields.networks || '';
      qs('#ag-skills').value = item.fields.skills || '';
      qs('#ag-projects').value = item.fields.projects || '';
      qs('#ag-listen').value = item.fields.listen || '';
      qs('#ag-intro').value = item.fields.intro || '';
      qs('#ag-offer').value = item.fields.offer || '';
      qs('#ag-next').value = item.fields.next || '';
      qs('#ag-nextmeet').value = item.fields.nextmeet || '';
      const summary = build121Summary(item);
      const ta = qs('#one-summary'); if(ta) ta.value = summary;
      // switch to tab m3
      activateTab('m3');
    });
    const copy = ce('button','btn secondary'); copy.textContent = t('copy');
    copy.addEventListener('click', async ()=>{
      const summary = build121Summary(item);
      try { await navigator.clipboard.writeText(summary); showStatus(t('copy_ok'), false); } catch { showStatus(t('copy_fail'), true); }
    });
    const pbtn = ce('button','btn secondary'); pbtn.textContent = t('print_meeting');
    pbtn.addEventListener('click', ()=>{
      const summary = build121Summary(item);
      const ta = qs('#one-summary'); if(ta) ta.value = summary;
      const pr = qs('#one-print'); if(pr){ pr.textContent = summary; }
      activateTab('m3');
      window.print();
    });
    const del = ce('button','btn danger'); del.textContent = t('delete');
    del.addEventListener('click', ()=>{
      const idx = state.data.oneToOnes.findIndex(x=>x.id===item.id);
      if(idx>=0){ state.data.oneToOnes.splice(idx,1); const r = saveData(state.data); if(!r.ok) showStatus(t('not_saved')+': '+r.error, true); renderOneList(); }
    });
    li.append(left, open, copy, pbtn, del);
    ul.appendChild(li);
  }
}

function build121Summary(item){
  const lines = [];
  lines.push(`${t('one_who')}: ${item.who||''}`);
  lines.push(`${t('one_where')}: ${item.where||''}`);
  lines.push(`${t('one_time')}: ${item.time||''}`);
  lines.push(`${t('one_goals')}: ${item.goals||''}`);
  const F = item.fields || {};
  const map = [
    ['agenda_vision','vision'],
    ['agenda_interests','interests'],
    ['agenda_networks','networks'],
    ['agenda_skills','skills'],
    ['agenda_projects','projects'],
    ['agenda_listen','listen'],
    ['agenda_intro_me','intro'],
    ['agenda_offer','offer'],
    ['agenda_next_step','next'],
    ['agenda_next_meeting','nextmeet'],
  ];
  for(const [key, field] of map){
    lines.push(`${t(key)}: ${F[field]||''}`);
  }
  return lines.join('\n');
}

function activateTab(tab){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.getAttribute('data-tab')===tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id===`panel-${tab}`));
}

function renderTreeSummary(){
  const d = state.data;
  const el = qs('#tree-summary'); if(!el) return;
  const parts = [];
  parts.push(d.company.name);
  parts.push(d.company.desc);
  const section = (title, arr) => {
    const names = arr.map(a=>a.name).filter(Boolean).join(', ');
    if (names) parts.push(`${title}: ${names}`);
  };
  section(t('summary_wanted'), d.wanted.areas);
  section(t('summary_current'), d.current.areas);
  const partnersWanted = d.wanted.partners.filter(Boolean).join(', ');
  if (partnersWanted) parts.push(`${t('wanted_partners')}: ${partnersWanted}`);
  const partnersCurrent = d.current.partners.filter(Boolean).join(', ');
  if (partnersCurrent) parts.push(`${t('current_partners')}: ${partnersCurrent}`);
  el.textContent = parts.filter(Boolean).join('\n');
}

function bindEvents(){
  // Tabs
  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tab = btn.getAttribute('data-tab');
      activateTab(tab);
    });
  });
  // Company form
  qs('#companyName').addEventListener('input', e=>{ setCompany(state.data, e.target.value, state.data.company.desc); const r=saveData(state.data); if(!r.ok) showStatus(t('not_saved')+': '+r.error, true); });
  qs('#companyDesc').addEventListener('input', e=>{ setCompany(state.data, state.data.company.name, e.target.value); const r=saveData(state.data); if(!r.ok) showStatus(t('not_saved')+': '+r.error, true); });
  // Weekly ask
  qs('#ask-branch').addEventListener('change', updateShortAsk);
  qs('#ask-who').addEventListener('input', updateShortAsk);
  qs('#ask-why').addEventListener('input', updateShortAsk);
  qs('#btn-save-ask').addEventListener('click', ()=>{
    const sel = qs('#ask-branch'); const i = sel.value==='' ? -1 : Number(sel.value);
    if(Number.isInteger(i) && i>=0){
      if(!state.data.weekly.usedAreaIndexes.includes(i)) state.data.weekly.usedAreaIndexes.push(i);
      const entry = {
        week: isoWeek(new Date()),
        areaIndex: i,
        who: qs('#ask-who').value.trim(),
        why: qs('#ask-why').value.trim(),
        short: qs('#ask-short').textContent
      };
      state.data.weekly.history.unshift(entry);
      const r = saveData(state.data); if(!r.ok) showStatus(t('not_saved')+': '+r.error, true);
      renderWeekly();
    } else {
      showStatus(t('select_branch'), true);
    }
  });
  // 1-2-1
  qs('#btn-pull-summary').addEventListener('click', ()=>{
    const parts = [];
    parts.push(state.data.company.name);
    parts.push(state.data.company.desc);
    const wanted = state.data.wanted.areas.map(a=>a.name).filter(Boolean).join(', ');
    if(wanted) parts.push(t('summary_wanted')+': '+wanted);
    const current = state.data.current.areas.map(a=>a.name).filter(Boolean).join(', ');
    if(current) parts.push(t('summary_current')+': '+current);
    qs('#ag-intro').value = parts.filter(Boolean).join(' — ');
  });
  qs('#btn-save-121').addEventListener('click', ()=>{
    const it = {
      id: String(Date.now())+'-'+Math.random().toString(36).slice(2,7),
      who: qs('#one-who').value.trim(),
      where: qs('#one-where').value.trim(),
      time: qs('#one-time').value,
      goals: qs('#one-goals').value.trim(),
      fields: {
        vision: qs('#ag-vision').value.trim(),
        interests: qs('#ag-interests').value.trim(),
        networks: qs('#ag-networks').value.trim(),
        skills: qs('#ag-skills').value.trim(),
        projects: qs('#ag-projects').value.trim(),
        listen: qs('#ag-listen').value.trim(),
        intro: qs('#ag-intro').value.trim(),
        offer: qs('#ag-offer').value.trim(),
        next: qs('#ag-next').value.trim(),
        nextmeet: qs('#ag-nextmeet').value.trim()
      }
    };
    const v = validate121(it);
    if(!v.ok){ showStatus(t('not_saved')+': '+v.error, true); return; }
    state.data.oneToOnes.unshift(it);
    saveData(state.data);
    renderOneList();
  });
  qs('#btn-export-121').addEventListener('click', ()=>{
    const curr = {
      who: qs('#one-who').value.trim(),
      where: qs('#one-where').value.trim(),
      time: qs('#one-time').value,
      goals: qs('#one-goals').value.trim(),
      fields: {
        vision: qs('#ag-vision').value.trim(),
        interests: qs('#ag-interests').value.trim(),
        networks: qs('#ag-networks').value.trim(),
        skills: qs('#ag-skills').value.trim(),
        projects: qs('#ag-projects').value.trim(),
        listen: qs('#ag-listen').value.trim(),
        intro: qs('#ag-intro').value.trim(),
        offer: qs('#ag-offer').value.trim(),
        next: qs('#ag-next').value.trim(),
        nextmeet: qs('#ag-nextmeet').value.trim()
      }
    };
    const summary = build121Summary(curr);
    const pr = qs('#one-print'); if(pr){ pr.textContent = summary; }
    window.print();
  });
  // Export/import/print
  qs('#btn-export').addEventListener('click', ()=>downloadJson());
  qs('#btn-import').addEventListener('click', ()=>qs('#import-file').click());
  qs('#import-file').addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const { ok, error } = await importJsonFile(file);
    e.target.value = '';
    if(ok){ state.data = loadData(); render(); showStatus(t('import_ok'), false); }
    else { showStatus((t('import_malformed')+': '+error), true); }
  });
  qs('#btn-print').addEventListener('click', ()=>window.print());
  const btnPrintM1 = qs('#btn-print-m1'); if(btnPrintM1){ btnPrintM1.addEventListener('click', ()=>{ activateTab('m1'); window.print(); }); }
  const btnExpBackup = qs('#btn-export-backup'); if(btnExpBackup){ btnExpBackup.addEventListener('click', ()=>{ exportRecoveryJson(); }); }

  // Language
  const langSel = qs('#lang-select');
  langSel.value = getLang();
  langSel.addEventListener('change', ()=>{
    setLang(langSel.value);
    applyI18n(document);
    render();
  });
}

function applyFlags(){
  const mods = enabledModules();
  const m1 = mods.M1, m2=mods.M2, m3=mods.M3;
  // Tabs and panels visibility
  qs('#tab-m1').style.display = m1 ? '' : 'none';
  qs('#panel-m1').style.display = m1 ? '' : 'none';
  qs('#tab-m2').style.display = m2 ? '' : 'none';
  qs('#panel-m2').style.display = m2 ? '' : 'none';
  qs('#tab-m3').style.display = m3 ? '' : 'none';
  qs('#panel-m3').style.display = m3 ? '' : 'none';
}

function init(){
  applyFlags();
  state.data = loadData();
  bindEvents();
  applyI18n(document);
  render();
  // Listen for storage errors
  try{
    window.addEventListener('natverk:storage-error', (e)=> showStatus(t('not_saved')+': '+(e.detail && e.detail.error || ''), true));
    window.addEventListener('natverk:data-invalid', ()=> { showStatus(t('not_saved')+': data invalid', true); const b=qs('#btn-export-backup'); if(b) b.style.display=''; });
  }catch{}
  // Check storage availability
  if(!canUseStorage()){ showStatus(t('storage_unavailable'), true); }
  // Recovery present?
  if(hasRecovery()){ const b=qs('#btn-export-backup'); if(b) b.style.display=''; }
}

document.addEventListener('DOMContentLoaded', init);
