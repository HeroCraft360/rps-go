import { CONFIG, SKINS, HOME_MAPS } from '../config.js';
export function rewardMatch(save, match) {
  if (match.phase !== 'MATCH_RESULT' || match.awarded) return 0;
  match.awarded = true;
  const victory = match.scores.player === CONFIG.wins;
  const requested = victory ? (match.manualSelections > 0 ? CONFIG.rewards.victory : 0) : -match.playerPerk.spent * CONFIG.rewards.lossPerSpentCharge;
  const amount = Math.max(-save.coins, requested) || 0;
  match.requestedReward = requested;
  save.coins += amount; match.reward = amount; return amount;
}
const catalog = kind => kind === 'map' ? { items: HOME_MAPS, owned: 'ownedMapIds', equipped: 'equippedMapId' } : { items: SKINS, owned: 'ownedSkinIds', equipped: 'equippedSkinId' };
export function purchase(save, id, kind = 'skin') {
  const { items, owned } = catalog(kind), item = items.find(s => s.id === id);
  if (!item || save[owned].includes(id)) return { ok: false, message: 'Already owned or unavailable.' };
  if (save.coins < item.price) return { ok: false, message: `You need ${item.price - save.coins} more GO Coins.` };
  save.coins -= item.price; save[owned].push(id);
  return { ok: true, message: `${item.name} unlocked!` };
}
export function equip(save, id, kind = 'skin') {
  const { items, owned, equipped } = catalog(kind);
  if (!items.some(item => item.id === id) || !save[owned].includes(id)) return false;
  save[equipped] = id; return true;
}
