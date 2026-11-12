import './localStorageShim.js';
import { CONFIG } from './config.js';

const sv = {
  export: 'Exportera',
  import: 'Importera',
  print: 'Skriv ut',
  m1_title: 'Sökträdet',
  company_center: 'Mitt företag (centrum)',
  company_name: 'Företagsnamn',
  company_desc: 'Kort beskrivning',
  wanted_areas: 'Önskade områden',
  wanted_partners: 'Önskade partners',
  current_areas: 'Nuvarande områden',
  current_partners: 'Nuvarande partners',
  area_name: 'Områdesnamn',
  contact_n: 'Kontakt',
  partner_n: 'Partner',
  gaps_summary: 'Tomma platser',
  print_page: 'Skriv ut denna sida',
  m2_title: 'Veckans sökning',
  select_branch: 'Välj önskat område',
  ask_who: 'Specifik person/roll eller företag',
  ask_why: 'Varför passar det bra?',
  save: 'Spara',
  short_version: 'Kort version (~10 sek)',
  m3_title: '1‑2‑1 förberedelser och anteckningar',
  one_who: 'Vem',
  one_where: 'Plats',
  one_time: 'Tid',
  one_goals: 'Mål',
  pull_summary: 'Hämta Sökträdet‑sammanfattning',
  agenda_vision: 'Vision/mål',
  agenda_interests: 'Intressen/familj',
  agenda_networks: 'Andra nätverk',
  agenda_skills: 'Färdigheter',
  agenda_projects: 'Tidigare projekt & nöjda kunder',
  agenda_listen: 'Vad lyssna efter',
  agenda_intro_me: 'Så här introducerar du mig',
  agenda_offer: 'Vad kan jag göra för dig',
  agenda_next_step: 'Nästa steg',
  agenda_next_meeting: 'Nästa möte',
  save_121: 'Spara 1‑2‑1',
  export_summary: 'Exportera sammanfattning',
  log_bnic: 'Logga 1‑2‑1 i BNI Connect',
  saved_121: 'Sparade 1‑2‑1',
  weekly_suggestion: 'För vecka {week}: föreslaget område “{name}”',
  word_count: '{words} ord',
  not_affiliated: 'Ej affilierat med eller godkänt av BNI.',
  language: 'Språk'
};

const en = {
  export: 'Export',
  import: 'Import',
  print: 'Print',
  m1_title: 'Search Tree',
  company_center: 'My company (center)',
  company_name: 'Company name',
  company_desc: 'Short description',
  wanted_areas: 'Wanted areas',
  wanted_partners: 'Wanted partners',
  current_areas: 'Current areas',
  current_partners: 'Current partners',
  area_name: 'Area name',
  contact_n: 'Contact',
  partner_n: 'Partner',
  gaps_summary: 'Empty slots',
  print_page: 'Print this page',
  m2_title: 'Weekly ask',
  select_branch: 'Pick wanted area',
  ask_who: 'Specific person/role or company',
  ask_why: 'Why is it a good fit?',
  save: 'Save',
  short_version: 'Short version (~10 sec)',
  m3_title: '1‑2‑1 prep & notes',
  one_who: 'Who',
  one_where: 'Where',
  one_time: 'Time',
  one_goals: 'Goals',
  pull_summary: 'Pull Search‑Tree summary',
  agenda_vision: 'Vision/goals',
  agenda_interests: 'Interests/family',
  agenda_networks: 'Other networks',
  agenda_skills: 'Skills',
  agenda_projects: 'Past projects & happy customers',
  agenda_listen: 'What to listen for',
  agenda_intro_me: 'How to introduce me',
  agenda_offer: 'What can I do for you',
  agenda_next_step: 'Next step',
  agenda_next_meeting: 'Next meeting',
  save_121: 'Save 1‑2‑1',
  export_summary: 'Export summary',
  log_bnic: 'Log the 1‑2‑1 in BNI Connect',
  saved_121: 'Saved 1‑2‑1s',
  weekly_suggestion: 'Week {week}: suggested area “{name}”',
  word_count: '{words} words',
  not_affiliated: 'Not affiliated with or endorsed by BNI.',
  language: 'Language'
};

export const I18N = { sv, en };

let current = (localStorage.getItem(CONFIG.storageKeys.lang) || 'sv');
if (!I18N[current]) current = 'sv';

export function t(key, vars = {}) {
  const str = (I18N[current] && I18N[current][key]) || key;
  return Object.keys(vars).reduce((s,k)=>s.replaceAll(`{${k}}`, String(vars[k])) , str);
}
export function getLang(){ return current; }
export function setLang(lang){
  current = I18N[lang] ? lang : 'sv';
  localStorage.setItem(CONFIG.storageKeys.lang, current);
}
export function applyI18n(root=document){
  root.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // Some static labels by id:
  const label = root.getElementById('i18n-label-language');
  if (label) label.textContent = t('language');
}
