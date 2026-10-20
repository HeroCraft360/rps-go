export class Sound {
  constructor() { this.enabled = true; }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }
  play(kind = 'click') {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const notes = { click: [550], lock: [380,760], beat: [160], shoot: [180,360,720], win: [523,659,784,1046], loss: [330,277,220], coin: [880,1175], bluff: [740,330,620] }[kind] || [550];
    notes.forEach((freq,i) => {
      const oscillator = this.ctx.createOscillator(), gain = this.ctx.createGain(), at = this.ctx.currentTime+i*.075;
      oscillator.type = 'square'; oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(.035,at); gain.gain.exponentialRampToValueAtTime(.001,at+.12);
      oscillator.connect(gain);gain.connect(this.ctx.destination);oscillator.start(at);oscillator.stop(at+.13);
    });
  }
}
