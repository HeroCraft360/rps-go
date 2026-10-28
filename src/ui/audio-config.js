import { CONFIG } from '../config.js';
export const CUES = Object.freeze(['rock', 'paper', 'scissors', 'shoot']);
export const AUDIO_CONFIG = Object.freeze({
  beatMs: CONFIG.timing.shake / 3, shootMs: CONFIG.timing.shoot,
  loadTimeoutMs: 5000, announcerGain: .55, sfxGain: .65, maxSfxGroups: 4,
});
export const ANNOUNCER_PREVIEWS = Object.freeze(Object.fromEntries(CUES.map(cue =>
  [cue, new URL(`../../assets/audio/${cue}-preview.wav`, import.meta.url).href])));
// No spoken recordings have been produced or approved. Set URLs only after approval.
export const ANNOUNCER_VOICES = Object.freeze({ rock: null, paper: null, scissors: null, shoot: null });
export const clampVolume = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
