import { CONFIG } from '../config.js';
import { validMove } from './rules.js';
export const newPerk = () => ({ charges: CONFIG.perkCharges, tell: null });
export const canBluff = perk => perk.charges > 0 && perk.tell === null;
export function submitTell(perk, move) {
  if (!canBluff(perk) || !validMove(move)) return false;
  perk.tell = move;
  perk.charges--;
  return true;
}
