import { MOVES } from '../config.js';
export const beats = Object.freeze({ rock: 'scissors', scissors: 'paper', paper: 'rock' });
export const counter = Object.freeze({ rock: 'paper', scissors: 'rock', paper: 'scissors' });
export const validMove = move => MOVES.includes(move);
export function outcome(player, opponent) {
  if (!validMove(player) || !validMove(opponent)) throw new TypeError('Unknown gesture');
  return player === opponent ? 'tie' : beats[player] === opponent ? 'player' : 'opponent';
}
export const randomMove = rng => MOVES[Math.min(2, Math.floor(rng() * MOVES.length))];
