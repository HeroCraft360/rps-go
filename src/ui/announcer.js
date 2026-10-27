import { AUDIO_CONFIG, CUES, ANNOUNCER_PREVIEWS, ANNOUNCER_VOICES, clampVolume } from './audio-config.js';
export { CUES } from './audio-config.js';
export const ANNOUNCER_ASSETS = ANNOUNCER_PREVIEWS;

export function currentCue(match, now) {
  if (!match) return null;
  if (match.phase === 'SHOOT_OVERLAY') return { name: 'shoot', key: `${match.id}:${match.round}:shoot` };
  if (match.phase !== 'HAND_SHAKE') return null;
  const beat = Math.min(2, Math.max(0, Math.floor((now - match.phaseAt) / AUDIO_CONFIG.beatMs)));
  return { name: CUES[beat], key: `${match.id}:${match.round}:${beat}` };
}
export class CueTracker {
  constructor() { this.reset(); }
  reset() { this.roundKey = null; this.seen = new Set(); }
  take(match, now) {
    const roundKey = match ? `${match.id}:${match.round}` : null;
    if (roundKey !== this.roundKey) { this.seen.clear(); this.roundKey = roundKey; }
    const cue = currentCue(match, now);
    if (!cue || this.seen.has(cue.key)) return null;
    this.seen.add(cue.key); return cue;
  }
  // Consume the current beat on resume; never replay missed audio.
  skip(match, now) { this.take(match, now); }
}

export class Announcer {
  constructor({ fetcher = (...args) => fetch(...args), fallback, voices = ANNOUNCER_VOICES,
    previews = ANNOUNCER_PREVIEWS, timeoutMs = AUDIO_CONFIG.loadTimeoutMs } = {}) {
    Object.assign(this, { fetcher, fallback, voices, previews, timeoutMs });
    this.buffers = new Map(); this.sources = new Set(); this.gains = new Map();
    this.loadedKinds = new Map(); this.controllers = new Set(); this.generation = 0;
    this.enabled = true; this.volume = .6; this.suspended = false;
  }
  unlock(ctx) {
    if (!ctx) return Promise.resolve();
    if (this.ctx && this.ctx !== ctx) { this.dispose(); this.buffers.clear(); this.loadedKinds.clear(); }
    this.ctx = ctx;
    this.loading ??= Promise.all(CUES.map(async cue => {
      const generation = this.generation;
      for (const [kind, url] of [['voice', this.voices[cue]], ['preview', this.previews[cue]]]) {
        if (!url) continue;
        const buffer = await this.load(url, ctx);
        if (generation !== this.generation) return;
        if (buffer) { this.buffers.set(cue, buffer); this.loadedKinds.set(cue, kind); return; }
      }
    }));
    return this.loading;
  }
  async load(url, ctx) {
    const controller = new AbortController(); this.controllers.add(controller);
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await this.fetcher(url, { signal: controller.signal });
          if (!response.ok) return null;
          return await ctx.decodeAudioData(await response.arrayBuffer());
        })(),
        new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null); }, this.timeoutMs); }),
      ]);
    } catch { return null; }
    finally { clearTimeout(timer); this.controllers.delete(controller); }
  }
  configure(enabled, volume) {
    this.enabled = Boolean(enabled); this.volume = clampVolume(volume);
    if (!this.enabled || !this.volume) this.stop();
    else for (const gain of this.gains.values()) gain.gain.value = this.volume * AUDIO_CONFIG.announcerGain;
  }
  suspend(hidden) { this.suspended = Boolean(hidden); if (hidden) this.stop(); }
  release(source) {
    if (!this.sources.delete(source)) return;
    source.onended = null;
    try { source.disconnect(); } catch { /* Already disconnected. */ }
    try { this.gains.get(source)?.disconnect(); } catch { /* Already disconnected. */ }
    this.gains.delete(source);
  }
  stop() {
    for (const source of [...this.sources]) { try { source.stop(); } catch { /* Already ended. */ } this.release(source); }
  }
  dispose() {
    this.stop(); this.generation++;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear(); this.loading = null;
  }
  play(cue) {
    if (!this.enabled || !this.volume || this.suspended || !CUES.includes(cue) || this.ctx?.state !== 'running') return false;
    this.stop();
    const buffer = this.buffers.get(cue);
    if (!buffer && this.fallback) { this.fallback(cue, this.volume); return false; }
    let source, gain;
    try {
      gain = this.ctx.createGain();
      gain.gain.value = this.volume * AUDIO_CONFIG.announcerGain;
      if (buffer) { source = this.ctx.createBufferSource(); source.buffer = buffer; }
      else {
        // Last-resort tone stays on the announcer channel, independent of SFX volume.
        source = this.ctx.createOscillator(); source.type = 'triangle';
        source.frequency.value = [220, 330, 440, 660][CUES.indexOf(cue)];
        gain.gain.setValueAtTime(this.volume * .08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.0001, this.ctx.currentTime + .12);
      }
      source.connect(gain); gain.connect(this.ctx.destination);
      this.sources.add(source); this.gains.set(source, gain);
      source.onended = () => this.release(source);
      source.start();
      // Bound audio to the existing visual slot; overlong clips cannot overlap a reveal.
      source.stop(this.ctx.currentTime + (buffer ? (cue === 'shoot' ? AUDIO_CONFIG.shootMs : AUDIO_CONFIG.beatMs) / 1000 : .13));
      return Boolean(buffer);
    } catch { if (source) this.release(source); try { gain?.disconnect(); } catch {} return false; }
  }
}
