import { CONFIG } from '../config.js';
import { validMove, randomMove, outcome } from './rules.js';
import { BotController } from './bot.js';
import { newPerk, canBluff, reserve, cancelReservation, expireReservation, resetPerkRound, submitTell } from './perks.js';

export class Match {
  #playerLocked = null;
  #botLocked = null;
  #plan = null;
  #readyAt = Infinity;
  constructor({ clock = () => performance.now(), rng = Math.random, bot = new BotController(rng) } = {}) {
    this.clock = clock; this.rng = rng; this.bot = bot;
    this.id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    this.phase = 'IDLE'; this.scores = { player: 0, opponent: 0 };
    this.playerPerk = newPerk(); this.botPerk = newPerk();
    this.recentRounds = []; this.history = []; this.events = []; this.eventId = 0;
    this.round = 0; this.manualSelections = 0; this.awarded = false; this.reward = 0;
    this.playerReady = false; this.botReady = false;
  }
  emit(type, data = {}, at = this.clock()) { this.events.push(Object.freeze({ id: ++this.eventId, type, round: this.round, at, ...data })); }
  drainEvents() { return this.events.splice(0); }
  start() { if (this.phase === 'IDLE') this.nextRound(); }
  nextRound() {
    this.#readyAt = Infinity;
    this.round++; this.selected = null; this.autoPick = false; this.botAutoPick = false;
    this.playerReady = false; this.botReady = false; this.#playerLocked = null; this.#botLocked = null;
    resetPerkRound(this.playerPerk); resetPerkRound(this.botPerk);
    this.result = null; this.final = null; this.resolutionReason = null;
    // Planning receives no match object or hidden selection.
    this.#plan = this.bot.planRound?.(Object.freeze({ roundNumber: this.round, charges: this.botPerk.charges })) ?? { readyAfterMs: Infinity, tell: null };
    this.enter('PRE_ROUND');
  }
  enter(phase) { this.phase = phase; this.phaseAt = this.clock(); }
  get locked() { return this.playerReady; }
  get active() { return ['CHOOSING', 'LOCKED'].includes(this.phase); }
  get bluffOpen() { return this.playerPerk.pending; }
  get remaining() { return this.active ? Math.max(0, Math.ceil((this.deadline - this.clock()) / 1000)) : ['PRE_ROUND','IDLE'].includes(this.phase) ? CONFIG.roundMs / 1000 : 0; }
  get canChoose() { return this.active && !this.playerReady && this.clock() < this.deadline; }
  get canPerk() { return this.canChoose && !this.botReady && canBluff(this.playerPerk); }
  select(move) {
    this.update();
    if (!this.canChoose || this.bluffOpen || !validMove(move)) return false;
    this.selected = move; this.manualSelections++; return true;
  }
  confirm() {
    this.update();
    if (!this.canChoose || this.bluffOpen || !this.selected) return false;
    this.#playerLocked = this.selected; this.playerReady = true;
    if (!this.botReady) {
      const { minMs, maxMs } = CONFIG.postLock;
      const delay = minMs + Math.floor(Math.max(0, Math.min(1, this.rng())) * (maxMs - minMs));
      this.#readyAt = Math.min(this.#readyAt, this.clock() + delay, this.deadline);
    }
    this.emit('READY', { actor: 'player' }); this.enter('LOCKED'); this.resolveIfReady(); return true;
  }
  openBluff() { this.update(); return this.canPerk && reserve(this.playerPerk); }
  cancelBluff() {
    // Escape delivered at zero cannot refund an expired reservation.
    this.update(); return this.canChoose && cancelReservation(this.playerPerk);
  }
  bluff(move) {
    this.update();
    if (!this.bluffOpen || !this.canChoose || this.botReady || !submitTell(this.playerPerk, move)) return false;
    this.emit('PUBLIC_TELL', { actor: 'player', move }); return true;
  }
  lockBot(at) {
    if (this.botReady) return;
    const move = this.bot.choose(Object.freeze({ previousRevealedPlayerMoves: Object.freeze([...this.history]), publicFakeTell: this.playerPerk.tell, roundNumber: this.round }));
    this.#botLocked = validMove(move) ? move : randomMove(this.rng);
    this.botAutoPick = !validMove(move); this.botReady = true;
    // Only a scheduled lock strictly BEFORE the deadline qualifies for a refund.
    if (at < this.deadline && cancelReservation(this.playerPerk)) {
      this.emit('PERK_REFUNDED', { actor: 'player', reason: 'opponent-locked' }, at);
    }
    this.emit('READY', { actor: 'opponent' }, at);
  }
  resolveIfReady() {
    if (!this.active || !this.playerReady || !this.botReady) return;
    this.resolutionReason = 'both-ready'; this.enter('BOTH_READY');
  }
  update() {
    const now = this.clock(), elapsed = now - this.phaseAt, timing = CONFIG.timing;
    // Reconcile selection deadlines on resume, retaining every cinematic beat.
    if (this.phase === 'PRE_ROUND' && elapsed >= timing.intro) {
      this.roundStartedAt = this.phaseAt + timing.intro;
      this.deadline = this.roundStartedAt + CONFIG.roundMs;
      this.#readyAt = this.roundStartedAt + this.#plan.readyAfterMs;
      this.enter('CHOOSING'); this.update();
    } else if (this.active) {
      const readyAt = this.#readyAt;
      const tellAt = this.roundStartedAt + this.#plan.tellAfterMs;
      // Planned public events precede the bot lock, including on a late tick.
      if (this.#plan.tell && this.#plan.tellAfterMs != null && tellAt < readyAt && tellAt < this.deadline && now >= tellAt && !this.botReady && !this.botPerk.roundUsed) {
        reserve(this.botPerk);
        if (submitTell(this.botPerk, this.#plan.tell)) this.emit('PUBLIC_TELL', { actor: 'opponent', move: this.botPerk.tell }, tellAt);
      }
      if (!this.botReady && now >= readyAt && readyAt < this.deadline) this.lockBot(readyAt);
      if (now >= this.deadline) {
        if (expireReservation(this.playerPerk)) this.emit('PERK_EXPIRED', { actor: 'player' });
        expireReservation(this.botPerk);
        if (!this.playerReady) { this.autoPick = this.selected === null; this.#playerLocked = this.selected ?? randomMove(this.rng); this.playerReady = true; }
        if (!this.botReady) { this.#botLocked = randomMove(this.rng); this.botAutoPick = true; this.botReady = true; }
        this.resolutionReason = 'deadline'; this.enter('HAND_SHAKE');
      } else this.resolveIfReady();
    } else if (this.phase === 'BOTH_READY' && elapsed >= timing.bothReady) this.enter('HAND_SHAKE');
    else if (this.phase === 'HAND_SHAKE' && elapsed >= timing.shake) this.enter('SHOOT_OVERLAY');
    else if (this.phase === 'SHOOT_OVERLAY' && elapsed >= timing.shoot) {
      // Private locks only become public at the actual reveal beat.
      this.final = Object.freeze({ player: this.#playerLocked, opponent: this.#botLocked });
      this.result = outcome(this.final.player, this.final.opponent);
      if (this.result !== 'tie') this.scores[this.result]++;
      this.history.push(this.final.player); this.history = this.history.slice(-CONFIG.bot.history);
      this.recentRounds.push(Object.freeze({ round: this.round, player: this.final.player, opponent: this.final.opponent,
        playerClaim: this.playerPerk.tell, opponentClaim: this.botPerk.tell, result: this.result,
        playerAutoPick: this.autoPick, opponentAutoPick: this.botAutoPick }));
      this.recentRounds = this.recentRounds.slice(-CONFIG.recentRounds);
      this.enter('REVEAL');
    } else if (this.phase === 'REVEAL' && elapsed >= timing.reveal) this.enter('ROUND_RESULT');
    else if (this.phase === 'ROUND_RESULT' && elapsed >= timing.result) {
      if (Math.max(...Object.values(this.scores)) >= CONFIG.wins) this.enter('MATCH_RESULT');
      else this.nextRound();
    }
  }
  stop() { this.update(); cancelReservation(this.playerPerk); cancelReservation(this.botPerk); this.events = []; this.phase = 'STOPPED'; }
}
