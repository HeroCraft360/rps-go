import { CONFIG, SKINS } from '../config.js';
export function rewardMatch(save, match) {
  if (match.phase !== 'MATCH_RESULT' || match.awarded) return 0;
  match.awarded = true;
  const amount = match.manualSelections > 0 ? (match.scores.player === CONFIG.wins ? CONFIG.rewards.victory : CONFIG.rewards.defeat) : 0;
  save.coins += amount; match.reward = amount; return amount;
}
export function purchase(save, id) {
  const skin = SKINS.find(s => s.id === id);
  if (!skin || save.ownedSkinIds.includes(id)) return { ok: false, message: 'Already owned or unavailable.' };
  if (save.coins < skin.price) return { ok: false, message: `You need ${skin.price - save.coins} more GO Coins.` };
  save.coins -= skin.price; save.ownedSkinIds.push(id);
  return { ok: true, message: `${skin.name} unlocked!` };
}
export function equip(save, id) {
  if (!save.ownedSkinIds.includes(id)) return false;
  save.equippedSkinId = id; return true;
}
