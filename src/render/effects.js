import { CONFIG } from '../config.js';

// Reconstructed from the phase clock: no timers, random stream, or retained particles.
export function effectFrame(match, now, { reduced=false, lowPower=false }={}) {
  const phase=match?.phase, elapsed=Math.max(0,now-(match?.phaseAt??now));
  if(reduced || !['HAND_SHAKE','SHOOT_OVERLAY','REVEAL'].includes(phase))return null;
  const shoot=phase==='SHOOT_OVERLAY', reveal=phase==='REVEAL';
  const beat=Math.min(2,Math.floor(elapsed/(CONFIG.timing.shake/3)));
  const progress=shoot?Math.min(1,elapsed/CONFIG.timing.shoot):reveal?Math.min(1,elapsed/320):(elapsed%(CONFIG.timing.shake/3))/(CONFIG.timing.shake/3);
  const energy=reveal?(1-progress)*.35:shoot?1-progress*.75:(beat+1)/3*(1-progress*.65);
  return {phase,beat,progress,energy,particles:lowPower?18:48,
    shakeX:Math.sin(elapsed*.09)*energy*(shoot?2:beat*.3),shakeY:Math.cos(elapsed*.07)*energy*(shoot?1.2:.3)};
}
export function drawEffects(c,f,front=false) {
  if(!f)return;
  c.save(); const {progress:p,energy:e}=f;
  if(!front) {
    c.globalAlpha=e*.6;c.fillStyle='#b94cff';c.fillRect(119,177,242,5);
    c.strokeStyle='#6defff';c.lineWidth=2;
    c.beginPath();c.ellipse(240,173,45+p*170,5+p*24,0,0,Math.PI*2);c.stroke();
    if(f.phase==='SHOOT_OVERLAY'){
      c.strokeStyle='#ba6aff';c.lineWidth=3;c.globalAlpha=(1-p)*.7;
      c.beginPath();c.ellipse(240,113,20+p*260,12+p*105,0,0,Math.PI*2);c.stroke();
    }
    const count=f.phase==='HAND_SHAKE'?Math.floor(f.particles*(f.beat+1)/3):f.particles;
    for(let i=0;i<count;i++) {
      const a=i*2.39996,rad=32+((i*29)%70)+p*(f.phase==='SHOOT_OVERLAY'?125:30);
      const x=240+Math.cos(a)*rad*1.5,y=113+Math.sin(a)*rad*.7;
      c.globalAlpha=e*(.3+(i%4)*.15);c.fillStyle=['#71f3ff','#f29fff','#ffe9a0'][i%3];
      c.fillRect(Math.round(x),Math.round(y),i%5===0?4:2,2);
      if(i%4===0&&f.phase==='SHOOT_OVERLAY') {c.strokeStyle=c.fillStyle;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x-Math.cos(a)*14,y-Math.sin(a)*8);c.stroke();}
    }
  } else if(f.phase==='SHOOT_OVERLAY'&&p<.18){c.globalAlpha=.1*(1-p/.18);c.fillStyle='#d9eaff';c.fillRect(0,0,480,205);}
  c.restore();
}
