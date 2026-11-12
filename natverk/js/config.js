export const CONFIG = {
  schemaVersion: 1,
  modules: {
    M1: true,
    M2: true,
    M3: true,
    M4: false,
    M5: false,
    M6: false,
    M7: false,
    M8: false
  },
  limits: {
    maxAreas: 5,
    maxContactsPerArea: 3,
    maxPartners: 5
  },
  storageKeys: {
    data: 'natverk_data_v1',
    lang: 'natverk_lang',
    recovery: 'natverk_data_v1_recovery',
    recoveryPrev: 'natverk:recovery-prev'
  }
};

export function enabledModules() {
  return Object.fromEntries(Object.entries(CONFIG.modules));
}
