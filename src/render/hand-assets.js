// Approved 768x768 runtime art. Bounds come from assets/hands/manifest.json.
// These files are already oriented inward: never mirror a loaded PNG.
const approved = Object.fromEntries([
  ['byte_rock', [21,264,746,635]], ['byte_paper', [21,141,746,623]],
  ['byte_scissors', [20,155,745,643]], ['player_rock', [23,310,747,659]],
  ['player_paper', [23,108,748,655]], ['player_scissors', [24,126,747,642]],
].map(([id,bounds])=>[id,Object.freeze({id,bounds:Object.freeze(bounds),url:new URL(`../../assets/hands/phase2a/${id}.png`,import.meta.url).href})]));

const premium = [["neon_circuit_rock",[35,306,748,655]],["neon_circuit_paper",[100,108,748,655]],["neon_circuit_scissors",[58,139,748,655]],["solar_flare_rock",[42,306,748,655]],["solar_flare_paper",[72,108,748,655]],["solar_flare_scissors",[79,139,748,655]]];
export const HAND_ART = Object.freeze({...approved,...Object.fromEntries(premium.map(([id,bounds])=>[id,Object.freeze({id,bounds:Object.freeze(bounds),url:new URL(`../../assets/hands/part3/${id}.png`,import.meta.url).href})]))});

export function handArtId(move, skin) {
  if(!['rock','paper','scissors'].includes(move))return null;
  return skin==='byte'?`byte_${move}`:skin==='classic'?`player_${move}`:['neon-circuit','solar-flare'].includes(skin)?`${skin.replaceAll('-','_')}_${move}`:null;
}

export class HandAssetCache {
  constructor({createImage=()=>new Image(),timeoutMs=8000}={}) {
    this.createImage=createImage;this.timeoutMs=timeoutMs;this.promise=null;
    this.records=new Map(Object.keys(HAND_ART).map(id=>[id,{state:'idle',image:null}]));
  }
  get state() {
    const states=[...this.records.values()].map(r=>r.state);
    if(states.every(s=>s==='idle'))return 'idle';
    if(states.some(s=>s==='loading'))return 'loading';
    if(states.every(s=>s==='ready'))return 'ready';
    return states.some(s=>s==='ready')?'degraded':'error';
  }
  get(move,skin) { const r=this.records.get(handArtId(move,skin));return r?.state==='ready'?r.image:null; }
  load() {
    if(this.promise)return this.promise;
    this.promise=Promise.all(Object.entries(HAND_ART).map(([id,art])=>new Promise(resolve=>{
      const record=this.records.get(id);record.state='loading';let settled=false,image,timer;
      const finish=ok=>{
        if(settled)return;settled=true;clearTimeout(timer);
        if(image){image.onload=null;image.onerror=null;}
        record.state=ok?'ready':'error';record.image=ok?image:null;resolve();
      };
      timer=setTimeout(()=>finish(false),this.timeoutMs);
      try {
        image=this.createImage();image.decoding='async';
        image.onerror=()=>finish(false);
        image.onload=()=>finish(image.naturalWidth===768&&image.naturalHeight===768);
        image.src=art.url;
      } catch { finish(false); }
    }))).then(()=>this.state);
    return this.promise;
  }
}
export const handAssets=new HandAssetCache();
