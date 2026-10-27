import { SKINS, HOME_MAPS } from '../config.js';
export const LEGACY_SAVE_KEY = 'rpsgo.save.v1';
export const SAVE_KEY = 'rpsgo.save.v2';
export const defaultSave = () => ({ version: 2, coins: 0, ownedSkinIds: ['classic'], equippedSkinId: 'classic', ownedMapIds: ['neon-launchpad'], equippedMapId: 'neon-launchpad', tutorialSeen: false, settings: { sound: true, reducedMotion: null, sfxVolume: .7, announcerVolume: .6 } });
export function validateSave(raw) {
  const save = defaultSave();
  if (!raw || ![1,2].includes(raw.version)) return save;
  if (Number.isSafeInteger(raw.coins) && raw.coins >= 0) save.coins = raw.coins;
  const validIds = new Set(SKINS.map(s => s.id));
  if (Array.isArray(raw.ownedSkinIds)) save.ownedSkinIds = [...new Set(['classic', ...raw.ownedSkinIds.filter(id => validIds.has(id))])];
  if (save.ownedSkinIds.includes(raw.equippedSkinId)) save.equippedSkinId = raw.equippedSkinId;
  const validMaps = new Set(HOME_MAPS.map(m => m.id));
  if (Array.isArray(raw.ownedMapIds)) save.ownedMapIds = [...new Set(['neon-launchpad', ...raw.ownedMapIds.filter(id => validMaps.has(id))])];
  if (save.ownedMapIds.includes(raw.equippedMapId)) save.equippedMapId = raw.equippedMapId;
  save.tutorialSeen = raw.tutorialSeen === true;
  if (typeof raw.settings?.sound === 'boolean') save.settings.sound = raw.settings.sound;
  if (typeof raw.settings?.reducedMotion === 'boolean') save.settings.reducedMotion = raw.settings.reducedMotion;
  for (const key of ['sfxVolume', 'announcerVolume']) {
    if (typeof raw.settings?.[key] === 'number' && Number.isFinite(raw.settings[key])) save.settings[key] = Math.max(0, Math.min(1, raw.settings[key]));
  }
  return save;
}
export function loadSave(storage) {
  for (const key of [SAVE_KEY, LEGACY_SAVE_KEY]) {
    try {
      const raw = JSON.parse(storage.getItem(key));
      if (!raw || ![1,2].includes(raw.version)) continue;
      const save = validateSave(raw);
      // Additive migration: v1 stays intact even if writing v2 is unavailable.
      if (key === LEGACY_SAVE_KEY) persistSave(storage, save);
      return save;
    } catch { /* Try the untouched legacy backup before returning defaults. */ }
  }
  return defaultSave();
}
export function persistSave(storage, save) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(validateSave(save))); return true; } catch { return false; }
}
