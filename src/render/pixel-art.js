// Original scan-converted pixel art. Every polygon is painted as integer pixel
// runs, without anti-aliasing. The same geometry supports local/remote skins.
export const PALETTES = {
  classic: { base: '#ffad75', light: '#ffe1ac', mid: '#ed8256', shade: '#ba4b46', deep: '#763449', cuff: '#7428d9', glow: '#ee85ff', metal: '#293878' },
  'neon-circuit': { base: '#54d8ee', light: '#cbfff6', mid: '#269dbb', shade: '#27619a', deep: '#253570', cuff: '#1257ac', glow: '#7cfff0', metal: '#165873' },
  'solar-flare': { base: '#ff9c44', light: '#ffeaa3', mid: '#ef583f', shade: '#b32a50', deep: '#671f58', cuff: '#ba356b', glow: '#ffe365', metal: '#763351' },
  byte: { base: '#8c9ff3', light: '#e5e9ff', mid: '#6470d3', shade: '#41459b', deep: '#2b286a', cuff: '#6322d6', glow: '#d99aff', metal: '#303e88' },
};
const ink = '#070c26';
function poly(ctx, points, color, ox = 0, oy = 0) {
  ctx.fillStyle = color;
  const ys = points.map(p => p[1]);
  for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
    const hits = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i < hits.length; i += 2) ctx.fillRect(Math.round(hits[i]) + ox, y + oy, Math.round(hits[i + 1]) - Math.round(hits[i]), 1);
  }
}
function shape(ctx, points, color) {
  for (const [x, y] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) poly(ctx, points, ink, x, y);
  poly(ctx, points, color);
}
function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
const cache = new Map();
export function sprite(move = 'rock', skin = 'classic') {
  const key = `${move}/${skin}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 104;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  const p = PALETTES[skin] || PALETTES.classic;
  // Arm plating, bevels and three independently shaded cuff segments.
  shape(c, [[78,64],[91,57],[116,60],[126,67],[126,91],[116,97],[80,93]], p.metal);
  poly(c, [[87,61],[114,62],[122,67],[100,67],[89,73],[79,72]], p.mid);
  poly(c, [[95,75],[125,69],[125,90],[116,94],[94,91]], p.deep);
  rect(c, 108,65,12,2,p.light);
  shape(c, [[75,61],[83,60],[90,67],[92,90],[85,98],[77,98],[71,88],[71,69]], p.cuff);
  poly(c, [[79,62],[83,64],[86,70],[87,90],[83,96],[79,94],[81,85]], p.glow);
  rect(c,77,68,2,20,p.light);
  shape(c, [[68,63],[73,61],[78,68],[78,91],[73,97],[68,92]], p.metal);
  rect(c,72,69,2,21,p.mid);
  // Palm and wrist are common; pose details are genuinely different geometry.
  shape(c, [[42,48],[57,47],[66,55],[71,66],[72,85],[64,94],[45,96],[30,88],[25,72],[29,56]], p.base);
  poly(c, [[28,73],[39,84],[53,88],[65,86],[70,76],[70,87],[62,93],[44,94],[31,86]],p.shade);
  poly(c, [[32,57],[44,51],[57,52],[62,58],[41,59],[35,70],[29,68]],p.light);
  if (move === 'paper') {
    // Four extended fingers + a separate opposable thumb, with clear gaps.
    const fingers = [
      [[29,60],[23,47],[16,26],[17,20],[22,19],[26,23],[35,49],[38,58]],
      [[36,55],[31,34],[29,12],[32,7],[38,7],[41,13],[44,50]],
      [[47,53],[46,28],[47,4],[51,2],[56,4],[58,9],[56,52]],
      [[58,58],[61,34],[65,17],[69,15],[74,18],[74,24],[67,63]],
    ];
    for (const points of fingers) { shape(c,points,p.base); poly(c,points.map(([x,y])=>[x+1,y+1]),p.mid); }
    poly(c,[[19,23],[22,23],[31,48],[29,47]],p.light);
    rect(c,33,12,3,24,p.light); rect(c,50,7,3,24,p.light);
    poly(c,[[67,20],[70,20],[65,44],[62,48]],p.light);
    rect(c,33,37,7,3,p.shade); rect(c,48,32,7,3,p.shade);
    poly(c,[[38,57],[49,53],[62,58],[64,72],[56,82],[39,80],[31,68]],p.base);
    shape(c,[[30,79],[19,69],[9,54],[10,48],[15,46],[20,50],[29,60],[38,66],[40,76]],p.base);
    poly(c,[[12,49],[16,49],[24,61],[20,61]],p.light);
    poly(c,[[25,72],[36,74],[40,69],[40,77],[31,81]],p.shade);
    poly(c,[[43,62],[46,65],[43,75],[48,83],[44,84],[39,74]],p.mid);
  } else if (move === 'scissors') {
    shape(c, [[39,59],[30,43],[18,20],[18,14],[22,11],[27,13],[31,20],[42,39],[49,55]],p.base);
    poly(c,[[20,15],[23,14],[28,23],[36,41],[32,39]],p.light);
    poly(c,[[26,30],[30,28],[34,35],[30,38]],p.shade);
    shape(c, [[49,56],[49,34],[50,10],[53,5],[59,5],[62,10],[61,36],[59,58]],p.base);
    rect(c,53,10,4,20,p.light); rect(c,51,32,9,3,p.mid);
    shape(c, [[55,53],[63,55],[69,63],[68,75],[61,79],[53,75],[50,66]],p.mid);
    poly(c,[[55,56],[60,56],[64,61],[62,66],[55,64]],p.light);
    shape(c, [[52,73],[61,70],[67,75],[66,84],[60,89],[49,85],[45,79]],p.base);
    rect(c,53,74,8,3,p.light);
    shape(c, [[30,61],[38,56],[49,57],[54,62],[51,70],[43,71],[40,80],[32,79],[28,71]],p.base);
    poly(c,[[32,63],[37,60],[47,60],[48,64],[37,65],[34,70]],p.light);
    poly(c,[[40,72],[45,71],[44,80],[36,85],[33,82]],p.deep);
  } else {
    // Curled knuckles, stepped fingertip planes and thumb across the fist.
    shape(c, [[27,58],[28,46],[34,41],[41,43],[44,51],[42,65],[34,69]],p.base);
    shape(c, [[40,53],[41,38],[47,34],[54,36],[58,45],[55,62],[47,64]],p.base);
    shape(c, [[54,53],[55,40],[61,37],[67,41],[70,50],[65,68],[58,66]],p.base);
    shape(c, [[65,61],[69,48],[75,48],[79,55],[77,70],[71,78],[64,74]],p.base);
    rect(c,31,47,7,5,p.light); rect(c,44,40,8,5,p.light); rect(c,58,43,7,5,p.light); rect(c,70,54,5,4,p.light);
    rect(c,31,58,7,3,p.shade); rect(c,45,53,8,3,p.shade); rect(c,58,56,7,3,p.shade);
    shape(c, [[26,64],[32,59],[42,61],[51,67],[52,74],[47,79],[37,74],[33,83],[28,81],[24,72]],p.base);
    poly(c,[[28,65],[32,63],[42,66],[47,69],[46,72],[36,68],[29,71]],p.light);
    poly(c,[[34,78],[39,77],[45,82],[56,83],[62,78],[63,84],[56,89],[42,88]],p.mid);
  }
  if (skin === 'neon-circuit') {
    rect(c,48,85,14,2,p.glow); rect(c,60,78,2,9,p.glow); rect(c,58,77,5,3,p.light);
    rect(c,101,77,2,10,p.glow); rect(c,101,77,13,2,p.glow); rect(c,113,74,4,4,p.light);
  }
  if (skin === 'solar-flare') {
    poly(c,[[45,89],[48,77],[52,82],[57,73],[59,87],[55,91]],p.glow);
    poly(c,[[103,88],[106,74],[110,80],[114,70],[116,87]],p.glow);
  }
  cache.set(key,canvas); return canvas;
}
export function paintIcon(canvas, move, skin = 'classic') {
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0,0,canvas.width,canvas.height);
  c.drawImage(sprite(move,skin), 4,0,78,102,0,0,canvas.width,canvas.height);
}
