import { SKINS } from '../config.js';
export const SAVE_KEY = 'rpsgo.save.v1';
export const defaultSave = () => ({ version: 1, coins: 0, ownedSkinIds: ['classic'], equippedSkinId: 'classic', tutorialSeen: false, settings: { sound: true, reducedMotion: null } });
export function validateSave(raw) {
  const save = defaultSave();
  if (!raw || raw.version !== 1) return save;
  if (Number.isSafeInteger(raw.coins) && raw.coins >= 0) save.coins = raw.coins;
  const validIds = new Set(SKINS.map(s => s.id));
  if (Array.isArray(raw.ownedSkinIds)) save.ownedSkinIds = [...new Set(['classic', ...raw.ownedSkinIds.filter(id => validIds.has(id))])];
  if (save.ownedSkinIds.includes(raw.equippedSkinId)) save.equippedSkinId = raw.equippedSkinId;
  save.tutorialSeen = raw.tutorialSeen === true;
  if (typeof raw.settings?.sound === 'boolean') save.settings.sound = raw.settings.sound;
  if (typeof raw.settings?.reducedMotion === 'boolean') save.settings.reducedMotion = raw.settings.reducedMotion;
  return save;
}
export function loadSave(storage) {
  try { return validateSave(JSON.parse(storage.getItem(SAVE_KEY))); } catch { return defaultSave(); }
}
export function persistSave(storage, save) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(validateSave(save))); return true; } catch { return false; }
}
