import { CONFIG } from '../config.js';
import { validMove, randomMove, outcome } from './rules.js';
import { BotController } from './bot.js';
import { newPerk, canBluff, submitTell } from './perks.js';

export class Match {
  constructor({ clock = () => performance.now(), rng = Math.random, bot = new BotController(rng) } = {}) {
    this.clock = clock; this.rng = rng; this.bot = bot;
    this.id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    this.phase = 'IDLE'; this.scores = { player: 0, opponent: 0 };
    this.playerPerk = newPerk(); this.botPerk = newPerk();
    this.history = []; this.round = 0; this.manualSelections = 0; this.awarded = false; this.reward = 0;
  }
  start() { if (this.phase === 'IDLE') this.nextRound(); }
  nextRound() {
    this.round++; this.selected = null; this.locked = false; this.autoPick = false;
    this.playerPerk.tell = null; this.botPerk.tell = null; this.result = null; this.final = null;
    this.bluffOpen = false; this.pendingTell = this.bot.planTell(this.round, this.botPerk.charges);
    this.enter('PRE_ROUND');
  }
  enter(phase) { this.phase = phase; this.phaseAt = this.clock(); }
  get remaining() { return ['CHOOSING', 'LOCKED'].includes(this.phase) ? Math.max(0, Math.ceil((this.deadline - this.clock()) / 1000)) : this.phase === 'PRE_ROUND' ? 10 : 0; }
  get canChoose() { return this.phase === 'CHOOSING' && this.clock() < this.deadline; }
  get canPerk() { return this.canChoose && canBluff(this.playerPerk); }
  select(move) {
    this.update();
    if (!this.canChoose || !validMove(move)) return false;
    this.selected = move; this.manualSelections++; return true;
  }
  confirm() {
    this.update();
    if (!this.canChoose || !this.selected) return false;
    this.locked = true; this.bluffOpen = false; this.enter('LOCKED'); return true;
  }
  openBluff() { this.update(); if (!this.canPerk) return false; this.bluffOpen = true; return true; }
  cancelBluff() { this.bluffOpen = false; }
  bluff(move) {
    this.update();
    if (!this.bluffOpen || !this.canPerk || !submitTell(this.playerPerk, move)) return false;
    this.bluffOpen = false; return true;
  }
  update() {
    const now = this.clock(), elapsed = now - this.phaseAt, timing = CONFIG.timing;
    // One transition per frame. Reconcile the deadline on resume, while allowing
    // each reveal beat to remain visible instead of skipping the whole animation.
    if (this.phase === 'PRE_ROUND' && elapsed >= timing.intro) {
      this.deadline = this.phaseAt + timing.intro + CONFIG.roundMs;
      this.enter('CHOOSING');
      if (now >= this.deadline) this.update();
    } else if (['CHOOSING', 'LOCKED'].includes(this.phase)) {
      if (now >= this.deadline) {
        this.bluffOpen = false;
        this.autoPick = this.selected === null;
        const player = this.selected ?? randomMove(this.rng);
        const opponent = this.bot.choose(Object.freeze({
          previousRevealedPlayerMoves: Object.freeze([...this.history]),
          publicFakeTell: this.playerPerk.tell, roundNumber: this.round,
        }));
        this.final = Object.freeze({ player, opponent });
        this.locked = true; this.enter('HAND_SHAKE');
      } else if (this.pendingTell && now >= this.deadline - CONFIG.roundMs + CONFIG.bot.bluffAtMs) {
        submitTell(this.botPerk, this.pendingTell); this.pendingTell = null;
      }
    } else if (this.phase === 'HAND_SHAKE' && elapsed >= timing.shake) this.enter('SHOOT_OVERLAY');
    else if (this.phase === 'SHOOT_OVERLAY' && elapsed >= timing.shoot) {
      this.result = outcome(this.final.player, this.final.opponent);
      if (this.result !== 'tie') this.scores[this.result]++;
      this.history.push(this.final.player); this.history = this.history.slice(-CONFIG.bot.history);
      this.enter('REVEAL');
    } else if (this.phase === 'REVEAL' && elapsed >= timing.reveal) this.enter('ROUND_RESULT');
    else if (this.phase === 'ROUND_RESULT' && elapsed >= timing.result) {
      if (Math.max(...Object.values(this.scores)) >= CONFIG.wins) this.enter('MATCH_RESULT');
      else this.nextRound();
    }
  }
  stop() { this.bluffOpen = false; this.phase = 'STOPPED'; }
}
