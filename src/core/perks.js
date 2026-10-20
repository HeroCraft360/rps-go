import { CONFIG } from '../config.js';
import { validMove } from './rules.js';

// charges = available; pending reserves one without permanently spending it.
export const newPerk = () => ({ charges: CONFIG.perkCharges, spent: 0, pending: false, tell: null, roundUsed: false, status: 'idle' });
export const canBluff = perk => perk.charges > 0 && !perk.pending && !perk.roundUsed;
export function reserve(perk) {
  if (!canBluff(perk)) return false;
  perk.charges--; perk.pending = true; perk.status = 'pending'; return true;
}
export function cancelReservation(perk) {
  if (!perk.pending) return false;
  perk.charges++; perk.pending = false; perk.status = 'idle'; return true;
}
export function expireReservation(perk) {
  if (!perk.pending) return false;
  perk.pending = false; perk.spent++; perk.roundUsed = true; perk.status = 'expired'; return true;
}
export function submitTell(perk, move) {
  if (!validMove(move) || perk.roundUsed) return false;
  if (!perk.pending && !reserve(perk)) return false;
  perk.pending = false; perk.spent++; perk.roundUsed = true; perk.status = 'submitted'; perk.tell = move; return true;
}
export function resetPerkRound(perk) {
  cancelReservation(perk);
  perk.tell = null; perk.roundUsed = false; perk.status = 'idle';
}
