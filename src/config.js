export const MOVES = Object.freeze(['rock', 'scissors', 'paper']);
export const CONFIG = Object.freeze({
  wins: 3, roundMs: 10000, perkCharges: 2,
  timing: Object.freeze({ intro: 650, shake: 1350, shoot: 700, reveal: 1200, result: 1200 }),
  bot: Object.freeze({ history: 5, prediction: .55, tellCounter: .5, tellDeception: .25, bluffChance: .55, bluffAtMs: 4000 }),
  rewards: Object.freeze({ victory: 120, defeat: 50 }),
});
export const SKINS = Object.freeze([
  { id: 'classic', name: 'Arcade Classic', price: 0, description: 'The original. Always in style.' },
  { id: 'neon-circuit', name: 'Neon Circuit', price: 300, description: 'Electric blue. Wired to outplay.' },
  { id: 'solar-flare', name: 'Solar Flare', price: 650, description: 'Bring a little heat to the arena.' },
]);
