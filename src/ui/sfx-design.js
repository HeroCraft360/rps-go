// Original synthesized designs, no sampled recordings or external audio dependencies.
// [wave, start Hz, end Hz, gain, start seconds, duration seconds]
export const SFX_DESIGNS = Object.freeze({
  click: [['sine', 900, 650, .09, 0, .055]],
  select: [['triangle', 520, 820, .12, 0, .09], ['sine', 1300, 980, .035, .025, .07]],
  lock: [['triangle', 320, 500, .14, 0, .11], ['sine', 840, 840, .08, .06, .13]],
  rock: [['sine', 120, 43, .32, 0, .22], ['noise', 0, 0, .08, 0, .035], ['triangle', 240, 85, .07, 0, .09]],
  paper: [['sine', 140, 55, .28, 0, .21], ['triangle', 470, 680, .09, .02, .15], ['noise', 0, 0, .045, 0, .04]],
  scissors: [['triangle', 410, 1150, .12, 0, .24], ['sine', 190, 65, .25, 0, .17], ['noise', 0, 0, .065, 0, .045]],
  shoot: [['sine', 160, 36, .34, 0, .46], ['noise', 0, 0, .14, 0, .06], ['triangle', 980, 110, .10, .01, .24], ['sine', 760, 90, .08, .035, .33], ['noise', 0, 0, .035, .11, .44]],
  bluff: [['sine', 370, 850, .12, 0, .16], ['triangle', 940, 270, .07, .08, .23]],
  incoming: [['triangle', 680, 300, .09, 0, .15], ['sine', 420, 720, .10, .12, .22]],
  claim: [['triangle', 580, 930, .12, 0, .10], ['sine', 1150, 700, .07, .055, .15]],
  win: [523, 659, 784, 1046].map((hz, i) => ['triangle', hz, hz, .13, i * .085, .21]),
  loss: [330, 277, 220].map((hz, i) => ['triangle', hz, hz * .95, .11, i * .09, .21]),
  coin: [['sine', 880, 880, .13, 0, .11], ['sine', 1175, 1175, .11, .08, .16]],
});
export function synthesizeSfx(kind, sampleRate) {
  const layers = SFX_DESIGNS[kind] || SFX_DESIGNS.click;
  const duration = Math.max(...layers.map(layer => layer[4] + layer[5])) + .005;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 173;
  for (const [wave, from, to, gain, offset, length] of layers) {
    const start = Math.round(offset * sampleRate), count = Math.floor(length * sampleRate);
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate, p = i / count;
      const phase = 2 * Math.PI * (from * t + (to - from) * t * t / (2 * length));
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = wave === 'noise' ? seed / 2147483648 - 1 : wave === 'triangle' ? 2 / Math.PI * Math.asin(Math.sin(phase)) : Math.sin(phase);
      const envelope = Math.min(1, t / .003) * (1 - p) ** 2;
      samples[start + i] += value * gain * envelope;
    }
  }
  // Four worst-case SFX peaks plus one full-scale voice stay below unity:
  // 4 * .16 * .65 + 1 * .55 = .966, even with both sliders at maximum.
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  if (peak > .16) for (let i = 0; i < samples.length; i++) samples[i] *= .16 / peak;
  return samples;
}
