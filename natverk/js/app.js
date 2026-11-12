import { CONFIG, enabledModules } from './config.js';
import { I18N, t, getLang, setLang, applyI18n } from './i18n.js';
import { defaultData, loadData, saveData } from './storage.js';
import { setCompany, setAreaName, setAreaContact, setPartner, computeGaps } from './model.js';
import { isoWeek, pickNextWantedIndex, summarizeAsk } from './rotation.js';
import { downloadJson, importJsonFile } from './exportImport.js';

const state = {
  data: defaultData()
};

function qs(sel){ return document.querySelector(sel); }
function ce(tag, cls){ const el = document.createElement(tag); if(cls) el.className=cls; return el; }

function render(){
  const d = state.data;
  // Company
  qs('#companyName').value = d.company.name;
  qs('#companyDesc').value = d.company.desc;

  renderSide('wanted', '#wanted-areas', '#wanted-partners');
  renderSide('current', '#current-areas', '#current-partners');

  // Gaps
  const gaps = computeGaps(d);
  const gapsEl = qs('#gaps-summary');
  gapsEl.innerHTML = '';
  const items = [
    ['wantedAreas','Önskade områden'],
    ['wantedContacts','Önskade kontakter'],
    ['wantedPartners','Önskade partners'],
    ['currentAreas','Nuvarande områden'],
    ['currentContacts','Nuvarande kontakter'],
    ['currentPartners','Nuvarande partners'],
  ];
  for(const [k,label] of items){
    const b = ce('span','badge'); b.textContent = `${label}: ${gaps[k]}`;
    gapsEl.appendChild(b);
  }

  // Weekly ask panel
  renderWeekly();

  // Saved 1-2-1s
  renderOneList();
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
      setAreaName(state.data, side, i, name.value); saveData(state.data); renderWeekly();
    });
    card.appendChild(h); card.appendChild(name);
    const slots = ce('div','slots');
    for(let j=0;j<limits.maxContactsPerArea;j++){
      const row = ce('div','slot');
      const num = ce('span','num'); num.textContent = j+1;
      const inp = ce('input'); inp.value = a.contacts[j]; inp.maxLength=100;
      inp.setAttribute('aria-label', `${t('contact_n')} ${j+1} (${i+1})`);
      inp.addEventListener('input', ()=>{
        setAreaContact(state.data, side, i, j, inp.value); saveData(state.data);
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
      setPartner(state.data, side, i, inp.value); saveData(state.data);
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
  d.wanted.areas.forEach((a,i)=>{
    if(a.name && a.name.trim()){
      const opt = ce('option'); opt.value = String(i); opt.textContent = a.name;
      if(String(i)===String(prev) || i===idx) opt.selected = true;
      sel.appendChild(opt);
    }
  });
  updateShortAsk();
}

function updateShortAsk(){
  const sel = qs('#ask-branch');
  const i = Number(sel.value ?? -1);
  const name = (Number.isInteger(i) && state.data.wanted.areas[i]) ? state.data.wanted.areas[i].name : '';
  const who = qs('#ask-who').value.trim();
  const why = qs('#ask-why').value.trim();
  const short = summarizeAsk(name, who, why);
  qs('#ask-short').textContent = short;
  const words = short.split(/\s+/).filter(Boolean).length;
  qs('#spoken-hint').textContent = t('word_count', { words });
}

function renderOneList(){
  const ul = qs('#one-list');
  ul.innerHTML = '';
  for(const item of state.data.oneToOnes){
    const li = ce('li');
    const left = ce('div');
    left.textContent = `${item.who || ''} — ${new Date(item.time||Date.now()).toLocaleString()}`;
    const del = ce('button','btn danger'); del.textContent = 'Ta bort';
    del.addEventListener('click', ()=>{
      const idx = state.data.oneToOnes.findIndex(x=>x.id===item.id);
      if(idx>=0){ state.data.oneToOnes.splice(idx,1); saveData(state.data); renderOneList(); }
    });
    li.append(left, del);
    ul.appendChild(li);
  }
}

function bindEvents(){
  // Tabs
  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b===btn));
      document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id===`panel-${tab}`));
    });
  });
  // Company form
  qs('#companyName').addEventListener('input', e=>{ setCompany(state.data, e.target.value, state.data.company.desc); saveData(state.data); });
  qs('#companyDesc').addEventListener('input', e=>{ setCompany(state.data, state.data.company.name, e.target.value); saveData(state.data); });
  // Weekly ask
  qs('#ask-branch').addEventListener('change', updateShortAsk);
  qs('#ask-who').addEventListener('input', updateShortAsk);
  qs('#ask-why').addEventListener('input', updateShortAsk);
  qs('#btn-save-ask').addEventListener('click', ()=>{
    const sel = qs('#ask-branch'); const i = Number(sel.value);
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
      saveData(state.data);
      renderWeekly();
    }
  });
  // 1-2-1
  qs('#btn-pull-summary').addEventListener('click', ()=>{
    const parts = [];
    parts.push(state.data.company.name);
    parts.push(state.data.company.desc);
    const wanted = state.data.wanted.areas.map(a=>a.name).filter(Boolean).join(', ');
    if(wanted) parts.push('Önskade områden: '+wanted);
    const current = state.data.current.areas.map(a=>a.name).filter(Boolean).join(', ');
    if(current) parts.push('Nuvarande områden: '+current);
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
    state.data.oneToOnes.unshift(it);
    saveData(state.data);
    renderOneList();
  });
  qs('#btn-export-121').addEventListener('click', ()=>{
    window.print();
  });
  // Export/import/print
  qs('#btn-export').addEventListener('click', ()=>downloadJson());
  qs('#import-file').addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const { ok, error } = await importJsonFile(file);
    e.target.value = '';
    if(ok){ state.data = loadData(); render(); alert('Import klar'); }
    else { alert('Import misslyckades: '+error); }
  });
  qs('#btn-print').addEventListener('click', ()=>window.print());

  // Language
  const langSel = qs('#lang-select');
  langSel.value = getLang();
  langSel.addEventListener('change', ()=>{
    setLang(langSel.value);
    applyI18n(document);
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
}

document.addEventListener('DOMContentLoaded', init);
