import { sprite, paintIcon as proceduralIcon } from './pixel-art.js';
import { HAND_ART, handArtId, handAssets } from './hand-assets.js';

// Common square camera keeps every fingertip/cuff intact and the wrists steady.
export const ARENA_HAND_LAYOUT=Object.freeze({byte:Object.freeze({x:8,y:-20,size:224}),player:Object.freeze({x:248,y:-20,size:224})});
export const HOME_HAND_LAYOUT=Object.freeze({x:140,y:-44,size:360});

export function drawArenaHand(c,{move='rock',skin='classic',side='player',bounce=0},assets=handAssets,procedural=sprite) {
  c.imageSmoothingEnabled=false;
  const image=assets.get(move,skin),p=ARENA_HAND_LAYOUT[side];
  if(image) { c.drawImage(image,p.x,p.y+Math.round(bounce),p.size,p.size);return 'approved'; }
  // Only the legacy BYTE sprite needs the original mirror transform.
  c.save();
  if(side==='byte'){c.translate(228,5+Math.round(bounce));c.scale(-1,1);}
  else c.translate(252,5+Math.round(bounce));
  c.drawImage(procedural(move,skin),0,0,128*1.65,104*1.65);c.restore();return 'procedural';
}

export function drawHomeHand(c,{pose='rock',skin='classic',bob=0},assets=handAssets,procedural=sprite) {
  c.imageSmoothingEnabled=false;
  const image=assets.get(pose,skin),p=HOME_HAND_LAYOUT;
  if(image){c.drawImage(image,p.x,p.y+bob,p.size,p.size);return 'approved';}
  c.drawImage(procedural(pose,skin),196,58+bob,128*2.05,104*2.05);return 'procedural';
}

export function paintIcon(canvas,move,skin='classic',assets=handAssets,fallback=proceduralIcon) {
  const image=assets.get(move,skin);
  if(!image){fallback(canvas,move,skin);return;}
  const c=canvas.getContext('2d'),[x,y,right,bottom]=HAND_ART[handArtId(move,skin)].bounds;
  const w=right-x,h=bottom-y,scale=Math.min(canvas.width/w,canvas.height/h);
  c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  // Trim transparent margins only; show the complete approved arm in icons.
  c.drawImage(image,x,y,w,h,(canvas.width-w*scale)/2,(canvas.height-h*scale)/2,w*scale,h*scale);
}
