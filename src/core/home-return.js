import { CONFIG } from '../config.js';

// Visible celebration time only; no timeout callback can navigate a later match.
export class HomeReturn {
  constructor(clock = () => performance.now()) { this.clock = clock; this.cancel(); }
  start(matchId) { this.id = matchId; this.left = CONFIG.timing.victoryHome; this.last = this.clock(); this.paused = false; }
  setPaused(value) { this.last = this.clock(); this.paused = value; }
  cancel() { this.id = null; this.left = 0; this.paused = false; this.last = this.clock(); }
  tick(matchId) {
    const now = this.clock(), delta = now - this.last; this.last = now;
    if (!this.id || matchId !== this.id || this.paused) return false;
    this.left = Math.max(0, this.left - delta);
    if (this.left > 0) return false;
    this.id = null; return true;
  }
  get seconds() { return Math.ceil(this.left / 1000); }
}
