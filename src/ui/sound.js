import { AUDIO_CONFIG, clampVolume } from './audio-config.js';
import { SFX_DESIGNS, synthesizeSfx } from './sfx-design.js';

export class Sound {
  constructor({ contextFactory = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
    this.contextFactory = contextFactory; this.enabled = true; this.volume = .7;
    this.suspended = false; this.buffers = new Map(); this.active = new Set();
    this.pcm = new Map(); this.ready = this.preload();
  }
  async preload() {
    // Yield between effects during page load, outside the input/unlock handler.
    // 22.05 kHz is sufficient for these original arcade effects; Web Audio resamples.
    for (const kind of Object.keys(SFX_DESIGNS)) {
      await new Promise(resolve => setTimeout(resolve, 0));
      this.pcm.set(kind, synthesizeSfx(kind, 22050));
      if (this.ctx) this.cache(kind);
    }
  }
  cache(kind) {
    if (this.buffers.has(kind) || !this.pcm.has(kind)) return;
    try {
      const samples = this.pcm.get(kind), buffer = this.ctx.createBuffer(1, samples.length, 22050);
      buffer.getChannelData(0).set(samples); this.buffers.set(kind, buffer);
    } catch { /* Audio may be unavailable; playback safely skips uncached effects. */ }
  }
  unlock() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') { this.stop(); this.ctx = this.contextFactory(); this.buffers.clear(); }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      for (const kind of this.pcm.keys()) this.cache(kind);
    } catch { /* Unsupported/blocked audio never interrupts gameplay. */ }
    return this.ctx;
  }
  configure(enabled, volume) {
    this.enabled = Boolean(enabled); this.volume = clampVolume(volume);
    if (!this.enabled || !this.volume) this.stop();
    else for (const entry of this.active) entry.gain.gain.value = this.volume * AUDIO_CONFIG.sfxGain;
  }
  suspend(hidden) { this.suspended = Boolean(hidden); if (hidden) this.stop(); }
  release(entry) {
    if (!this.active.delete(entry)) return;
    entry.source.onended = null;
    try { entry.source.disconnect(); entry.gain.disconnect(); } catch { /* Already disconnected. */ }
  }
  stopEntry(entry) { try { entry.source.stop(); } catch {} this.release(entry); }
  stop() { for (const entry of [...this.active]) this.stopEntry(entry); }
  play(kind = 'click', volume = this.volume) {
    if (!this.enabled || !this.volume || !volume || this.suspended || this.ctx?.state !== 'running') return false;
    const buffer = this.buffers.get(kind === 'beat' ? 'rock' : kind) || this.buffers.get('click');
    if (!buffer) return false;
    if (this.active.size >= AUDIO_CONFIG.maxSfxGroups) this.stopEntry(this.active.values().next().value);
    let entry;
    try {
      const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      source.buffer = buffer; gain.gain.value = clampVolume(volume) * AUDIO_CONFIG.sfxGain;
      source.connect(gain); gain.connect(this.ctx.destination);
      entry = { source, gain }; this.active.add(entry);
      source.onended = () => this.release(entry); source.start(); return true;
    } catch { if (entry) this.release(entry); return false; }
  }
}
