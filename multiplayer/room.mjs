import { randomBytes, randomInt } from 'node:crypto';

const MOVES = new Set(['rock', 'paper', 'scissors']);
const WIN = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
export const makeCode = () => randomBytes(5).toString('hex').toUpperCase();
export const makeToken = () => randomBytes(24).toString('hex');

export class Room {
  constructor(code, now = Date.now()) {
    this.code = code;
    this.players = [];
    this.scores = [0, 0];
    this.phase = 'waiting';
    this.round = 0;
    this.deadline = null;
    this.revealUntil = null;
    this.reveal = null;
    this.votes = new Set();
    this.updatedAt = now;
  }
  join(now = Date.now()) {
    if (this.players.length >= 2) throw new Error('ROOM_FULL');
    const seat = this.players.length;
    const token = makeToken();
    this.players.push({ token, hand: null, auto: false });
    this.updatedAt = now;
    if (this.players.length === 2) this.beginRound(now);
    return { room: this.code, seat, token };
  }
  seatFor(token) {
    const seat = this.players.findIndex(p => p.token === token);
    if (seat < 0) throw new Error('INVALID_SEAT');
    return seat;
  }
  beginRound(now) {
    this.phase = 'choosing';
    this.round++;
    this.deadline = now + 20_000;
    this.revealUntil = null;
    this.reveal = null;
    for (const player of this.players) { player.hand = null; player.auto = false; }
    this.updatedAt = now;
  }
  choose(token, hand, now = Date.now()) {
    this.seatFor(token);
    this.tick(now);
    if (this.phase !== 'choosing') throw new Error('ROUND_CLOSED');
    if (!MOVES.has(hand)) throw new Error('INVALID_MOVE');
    const seat = this.seatFor(token);
    if (this.players[seat].hand !== null) throw new Error('ALREADY_LOCKED');
    this.players[seat].hand = hand;
    this.updatedAt = now;
    if (this.players.every(p => p.hand)) this.finishRound(now);
  }
  finishRound(now) {
    const [a, b] = this.players.map(p => p.hand);
    const winner = a === b ? null : WIN[a] === b ? 0 : 1;
    if (winner !== null) this.scores[winner]++;
    this.reveal = { hands: [a, b], automatic: this.players.map(p => p.auto), winner };
    this.phase = 'reveal';
    this.revealUntil = now + 2600;
    this.updatedAt = now;
  }
  tick(now = Date.now()) {
    if (this.phase === 'choosing' && now >= this.deadline) {
      for (const p of this.players) {
        if (p.hand === null) { p.hand = [...MOVES][randomInt(3)]; p.auto = true; }
      }
      this.finishRound(now);
      return true;
    }
    if (this.phase === 'reveal' && now >= this.revealUntil) {
      if (Math.max(...this.scores) >= 3) {
        this.phase = 'finished'; this.updatedAt = now;
      } else this.beginRound(now);
      return true;
    }
    return false;
  }
  rematch(token, now = Date.now()) {
    const seat = this.seatFor(token);
    this.tick(now);
    if (this.phase !== 'finished') throw new Error('NOT_FINISHED');
    this.votes.add(seat);
    if (this.votes.size === 2) {
      this.votes.clear(); this.scores = [0, 0]; this.round = 0; this.beginRound(now);
    }
    this.updatedAt = now;
  }
  view(token, now = Date.now()) {
    const seat = this.seatFor(token);
    this.tick(now);
    const opponent = 1 - seat;
    return {
      room: this.code, seat, phase: this.phase, round: this.round,
      scores: this.scores, deadline: this.deadline,
      youReady: Boolean(this.players[seat].hand),
      opponentReady: Boolean(this.players[opponent]?.hand),
      yourMove: this.players[seat].hand,
      reveal: this.phase === 'reveal' || this.phase === 'finished' ? this.reveal : null,
      winner: this.phase === 'finished' ? (this.scores[0] > this.scores[1] ? 0 : 1) : null,
      rematchVotes: this.votes.size,
      serverNow: now
    };
  }
}
