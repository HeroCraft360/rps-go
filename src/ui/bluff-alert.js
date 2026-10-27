import { CONFIG, MOVES } from '../config.js';
import { paintIcon } from '../render/hands.js';

const choosing = phase => ['CHOOSING', 'LOCKED'].includes(phase);
const showdown = phase => ['BOTH_READY', 'HAND_SHAKE', 'SHOOT_OVERLAY'].includes(phase);

// Presentation only: consumes public events and phase/round metadata, never locks.
export class BluffAlert {
  constructor(root, announce, sound, paint = paintIcon) {
    Object.assign(this, { root, announce, sound, paint });
    this.clear();
  }
  show(event, now, context) {
    this.update(now, context);
    if (!context || !(choosing(context.phase) || showdown(context.phase)) ||
        event.type !== 'PUBLIC_TELL' || event.actor !== 'opponent' ||
        event.round !== context.round || !MOVES.includes(event.move) ||
        !Number.isFinite(event.at) || event.at > now || now - event.at >= CONFIG.timing.bluffAlert) return;
    const key = `${event.round}:${event.id ?? event.at}`;
    if (key === this.lastEvent) return;
    this.lastEvent = key; this.round = event.round;
    this.until = now + CONFIG.timing.bluffAlert; this.exitAt = 0;
    this.root.innerHTML = `<div class="bluff-heading"><span aria-hidden="true">✦</span> INCOMING SIKE OUT! <span class="bluff-signal" aria-hidden="true">▂▄▆</span></div><div class="bluff-body"><div class="bluff-hand"><canvas width="100" height="100" aria-hidden="true"></canvas></div><div class="bluff-copy"><small class="bluff-prediction">BYTE CLAIMS:</small><small class="bluff-compact-label">BYTE CLAIMS</small><strong>${event.move.toUpperCase()}</strong><em>It's a lieeeeee...</em></div></div><div class="bluff-footer">PUBLIC CLAIM <span>TRUST YOUR INSTINCTS</span></div>`;
    this.paint(this.root.querySelector('canvas'), event.move, 'byte');
    this.setState(showdown(context.phase) ? 'compact' : 'full');
    this.root.hidden = false;
    this.announce.textContent = `Incoming Sike Out! BYTE publicly claims ${event.move}. It's a lieeeeee... This is a bluff, not a guaranteed prediction.`;
    this.sound.play('incoming');
  }
  setState(state) {
    if (this.state === state) return;
    this.state = state; this.root.dataset.state = state;
  }
  update(now, { phase, round, reduced = false } = {}) {
    if (this.state === 'hidden') return;
    if (round !== this.round || !['CHOOSING','LOCKED','BOTH_READY','HAND_SHAKE','SHOOT_OVERLAY','REVEAL','ROUND_RESULT'].includes(phase)) {
      this.clear(); return;
    }
    if (this.state === 'exiting') {
      if (reduced || now >= this.exitAt) this.finish();
      return;
    }
    if (['REVEAL','ROUND_RESULT'].includes(phase)) { this.exit(now, reduced); return; }
    if (showdown(phase)) {
      // Keep only the public claim through SHOOT, without extending any match phase.
      this.setState('compact'); return;
    }
    if (now >= this.until) this.exit(now, reduced);
  }
  exit(now, reduced) {
    if (reduced) { this.finish(); return; }
    this.root.dataset.exitFrom = this.state;
    this.exitAt = now + CONFIG.timing.bluffExit;
    this.setState('exiting');
  }
  finish() { this.root.hidden = true; this.root.innerHTML = ''; this.until = 0; this.exitAt = 0; this.setState('hidden'); }
  clear() { this.finish(); this.round = null; this.lastEvent = null; delete this.root.dataset.exitFrom; }
}
