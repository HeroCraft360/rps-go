import { drawArenaHand } from './hands.js';
import { effectFrame, drawEffects } from './effects.js';
import { CONFIG } from '../config.js';
export class Arena {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); }
  draw({ now = 0, match = null, skin = 'classic', reduced = false, home = false }) {
    const c = this.ctx, w = this.canvas.width = 480, h = this.canvas.height = 205;
    c.imageSmoothingEnabled = false;
    c.clearRect(0,0,w,h);
    const t = reduced ? 0 : now / 1000;
    // Angular, stepped perspective rays converge just behind the platform.
    for (let side = -1; side <= 1; side += 2) {
      for (let ray = 0; ray < 5; ray++) {
        c.fillStyle = ['#151258','#161b65','#112754'][ray % 3];
        for (let p = 0; p < 14; p++) {
          const x = 240 + side * (46 + p * (9 + ray * 2));
          const y = 167 - p * (5 + ray * 2) + ray * 10;
          c.fillRect(x,y,5 + p * .45,7);
        }
      }
    }
    for (let i = 0; i < 45; i++) {
      const x = (i * 137 + 13) % w, y = (i * 47 + 7) % 180;
      c.fillStyle = i % 4 === 0 ? '#6575cc' : '#263f9d';
      c.globalAlpha = .5 + .35 * Math.sin(t + i);
      c.fillRect(x,y,i % 7 === 0 ? 2 : 1,i % 7 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
    // Pixel hover-platform: layered stepped slab, rails and small vents.
    c.save(); c.translate(0,-15);
    for (let i = 10; i > 0; i--) {
      c.fillStyle = `rgba(112,34,255,${.018 * (11-i)})`;
      c.fillRect(118-i*5,183-i*2,244+i*10,23+i*3);
    }
    const r = (x,y,a,b,color) => { c.fillStyle=color;c.fillRect(x,y,a,b); };
    r(111,193,258,18,'#06091d'); r(117,187,246,5,'#3c45cf');
    r(109,193,262,9,'#6930d9'); r(114,197,252,11,'#da46ff');
    r(121,202,238,9,'#531094'); r(124,209,232,4,'#171748');
    r(119,187,242,4,'#5982ff'); r(124,179,232,8,'#0e1748');
    r(128,177,224,3,'#3a4bd0'); r(121,192,238,3,'#7b8fff');
    r(121,197,238,3,'#ff88ff'); r(133,200,214,7,'#201246');
    r(173,197,134,3,'#ee7dff');
    for (let i = 0; i < 6; i++) { r(142+i*5,203,3,2,'#f392ff'); r(314+i*5,203,3,2,'#f392ff'); }
    c.restore();
    const phase = match?.phase;
    const revealed = ['REVEAL','ROUND_RESULT','MATCH_RESULT'].includes(phase);
    let playerMove = revealed ? match.final.player : 'rock';
    let byteMove = revealed ? match.final.opponent : 'rock';
    if (home) { playerMove = 'scissors'; byteMove = 'rock'; }
    let bounce = reduced ? 0 : Math.sin(t * 2) * 1.3;
    if (phase === 'HAND_SHAKE' && !reduced) bounce = -Math.sin((now - match.phaseAt) / CONFIG.timing.shake * Math.PI * 6) * 10;
    const fx=effectFrame(match,now,{reduced,lowPower:this.canvas.clientWidth<500});
    drawEffects(c,fx);c.save();if(fx)c.translate(fx.shakeX,fx.shakeY);
    drawArenaHand(c,{move:byteMove,skin:'byte',side:'byte',bounce});
    drawArenaHand(c,{move:playerMove,skin,side:'player',bounce});
    c.restore();drawEffects(c,fx,true);
    // A small floating diamond leaves the two hands as the visual focus.
    r(238,113,4,4,'#596cbd'); r(235,116,10,3,'#5865ad'); r(238,119,4,3,'#3e4787');
  }
}
