import { drawHomeHand } from './hands.js';

const themes = {
  'neon-launchpad': { base: '#080d2a', dark: '#1b1757', mid: '#393b9e', light: '#9981ff', glow: '#d270ff' },
  'circuit-sanctuary': { base: '#061925', dark: '#093643', mid: '#1d7282', light: '#83ffed', glow: '#23c9ef' },
  'starlight-hangar': { base: '#130c2b', dark: '#321855', mid: '#643b99', light: '#f7b3ff', glow: '#eb66dd' },
};
const backgrounds = new Map();
const block = (c,x,y,w,h,color) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
function ring(c,x,y,rx,ry,color,step=4,offset=0) {
  for (let a=0;a<360;a+=step) { const r=(a+offset)*Math.PI/180; block(c,x+Math.cos(r)*rx,y+Math.sin(r)*ry,3,3,color); }
}
function background(id) {
  if(backgrounds.has(id))return backgrounds.get(id);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
  const c=canvas.getContext('2d'),p=themes[id]||themes['neon-launchpad'];
  block(c,0,0,640,360,p.base);
  const glow=c.createRadialGradient(320,185,10,320,185,300);glow.addColorStop(0,p.dark);glow.addColorStop(1,p.base);c.fillStyle=glow;c.fillRect(0,0,640,360);
  for(let i=0;i<90;i++)block(c,(i*137+21)%640,(i*73+17)%260,i%8===0?2:1,i%8===0?2:1,i%4===0?p.light:p.mid);
  if(id==='circuit-sanctuary') {
    for(let i=0;i<7;i++) {
      for(const side of [-1,1]) {
        const x=320+side*(150+i*20),y=50+i*31;
        block(c,x,y,side*35,2,p.mid);block(c,x+side*35,y,2,70,p.mid);block(c,x-2,y-2,6,6,p.light);
      }
    }
    ring(c,320,163,157,114,p.mid,2);ring(c,320,163,168,125,p.dark,2);
  } else if(id==='starlight-hangar') {
    for(const side of [-1,1])for(let i=0;i<3;i++) {
      const x=320+side*(181+i*52),y=54+i*22;
      block(c,x,y,20,230,p.dark);block(c,x+5,y+7,3,202,p.light);block(c,x+10,y+8,6,202,p.mid);
      block(c,x-4,y-7,28,8,p.mid);block(c,x-4,281,28,8,p.glow);
    }
    ring(c,320,157,144,132,p.mid,2);ring(c,320,157,134,122,p.glow,3);
  } else {
    for(const side of [-1,1])for(let i=0;i<8;i++) {
      block(c,320+side*(126+i*19),90+i*14,12,8,p.dark);
      block(c,320+side*(138+i*19),92+i*14,7,4,p.mid);
    }
    ring(c,320,233,204,52,p.dark,2);
  }
  // A pixel perspective floor and raised, layered pedestal shared across maps.
  for(let y=293;y<360;y+=14)block(c,0,y,640,1,p.dark);
  for(let i=-8;i<=8;i++)for(let j=0;j<70;j++)block(c,320+i*(12+j*.65),290+j,1,1,p.dark);
  block(c,161,296,318,25,'#040b20');block(c,170,285,300,12,p.mid);block(c,180,277,280,9,p.light);
  block(c,178,290,284,5,p.glow);block(c,164,305,312,6,p.glow);block(c,181,311,278,12,p.dark);
  block(c,193,282,254,4,'#d5e7ff');block(c,203,287,234,3,p.base);
  for(let i=0;i<16;i++)block(c,215+i*14,315,6,3,p.light);
  backgrounds.set(id,canvas);return canvas;
}
export class HomeHubRenderer {
  constructor(canvas) { this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=640;canvas.height=360; }
  draw({ map='neon-launchpad',skin='classic',pose='rock',now=0,reduced=false,thumbnail=false }) {
    const c=this.ctx,p=themes[map]||themes['neon-launchpad'],t=reduced?0:now/1000;
    c.imageSmoothingEnabled=false;c.drawImage(background(map),0,0);
    if(map==='circuit-sanctuary') { ring(c,320,166,151,109,p.light,16,t*8);ring(c,320,260,149,28,p.glow,8,-t*12); }
    if(map==='starlight-hangar') ring(c,320,157,139,127,p.light,19,t*5);
    if(map==='neon-launchpad')ring(c,320,281,136,19,p.glow,10,t*10);
    for(let i=0;i<20;i++) { const y=260-((i*19+t*14)%200);c.globalAlpha=.2+.3*(1+Math.sin(i+t))/2;block(c,150+(i*67)%340,y,2,4,p.light); }
    c.globalAlpha=1;
    if(!thumbnail) {
      const bob=reduced?0:Math.round(Math.sin(t*1.8)*3);
      drawHomeHand(c,{pose,skin,bob});
      block(c,255,334,130,1,p.mid);
    }
  }
}
