export const MOVES = Object.freeze(['rock', 'scissors', 'paper']);
export const CONFIG = Object.freeze({
  wins: 3, roundMs: 20000, perkCharges: 2,
  timing: Object.freeze({ intro: 650, bothReady: 400, shake: 1350, shoot: 700, reveal: 1200, result: 1200, bluffAlert: 5500, bluffExit: 220, victoryHome: 3000 }),
  // Phase 2B blueprint PROPOSED defaults; tune these without changing rules.
  bot: Object.freeze({ history: 5, prediction: .55, tellCounter: .5, tellDeception: .25, bluffChance: .7, readyMinMs: 4000, readyMaxMs: 15000, tellMinMs: 1200, tellLeadMs: 2600 }),
  rewards: Object.freeze({ victory: 120, defeat: 0, lossPerSpentCharge: 25, penalizeAbandonment: false }),
});
export const SKINS = Object.freeze([
  { id: 'classic', name: 'Arcade Classic', price: 0, description: 'The original. Always in style.' },
  { id: 'neon-circuit', name: 'Neon Circuit', price: 300, description: 'Electric blue. Wired to outplay.' },
  { id: 'solar-flare', name: 'Solar Flare', price: 650, description: 'Bring a little heat to the arena.' },
]);
export const HOME_MAPS = Object.freeze([
  { id: 'neon-launchpad', name: 'Neon Launchpad', price: 0, description: 'Your own little corner of the cosmos.', accent: '#ac72ff' },
  { id: 'circuit-sanctuary', name: 'Circuit Sanctuary', price: 700, description: 'Holographic rings. Electric tranquility.', accent: '#65efed' },
  { id: 'starlight-hangar', name: 'Starlight Hangar', price: 1400, description: 'A portal to your next great showdown.', accent: '#ff91de' },
]);
