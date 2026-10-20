import { CONFIG, MOVES } from '../config.js';
import { counter, randomMove, validMove } from './rules.js';

// This boundary accepts ONLY public tells, previous reveals and round metadata.
// A future opponent controller can replace this policy without changing the UI.
export function chooseMove({ previousRevealedPlayerMoves = [], publicFakeTell = null, roundNumber = 1 }, rng = Math.random) {
  if (validMove(publicFakeTell)) {
    const roll = rng();
    if (roll < CONFIG.bot.tellCounter) return counter[publicFakeTell];
    if (roll < CONFIG.bot.tellCounter + CONFIG.bot.tellDeception) return counter[counter[publicFakeTell]];
  }
  const history = previousRevealedPlayerMoves.filter(validMove).slice(-CONFIG.bot.history);
  if (roundNumber > 1 && history.length && rng() < CONFIG.bot.prediction) {
    // Sample the observed frequency distribution, with a small uniform prior.
    const weights = MOVES.map(move => 1 + history.filter(item => item === move).length * 2);
    let sample = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < MOVES.length; i++) {
      sample -= weights[i];
      if (sample < 0) return counter[MOVES[i]];
    }
  }
  return randomMove(rng);
}
export class BotController {
  constructor(rng = Math.random) { this.rng = rng; }
  choose(publicState) { return chooseMove(publicState, this.rng); }
  planTell(round, charges) {
    return round > 1 && charges > 0 && this.rng() < CONFIG.bot.bluffChance ? randomMove(this.rng) : null;
  }
  planRound({ roundNumber, charges }) {
    const { readyMinMs, readyMaxMs, tellMinMs, tellLeadMs } = CONFIG.bot;
    const readyAfterMs = readyMinMs + Math.floor(this.rng() * (readyMaxMs - readyMinMs));
    const tell = this.planTell(roundNumber, charges);
    const tellAfterMs = tell ? tellMinMs + Math.floor(this.rng() * Math.max(0, readyAfterMs - tellLeadMs - tellMinMs)) : null;
    return Object.freeze({ readyAfterMs, tellAfterMs, tell });
  }
}
