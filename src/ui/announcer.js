import { CONFIG } from '../config.js';
export const CUES=Object.freeze(['rock','paper','scissors','shoot']);
// Original tonal preview files. Replace URLs with licensed spoken cues when supplied.
export const ANNOUNCER_ASSETS=Object.freeze(Object.fromEntries(CUES.map(cue=>[cue,new URL(`../../assets/audio/${cue}-preview.wav`,import.meta.url).href])));
export function currentCue(match, now) {
  if(!match)return null;
  if(match.phase==='SHOOT_OVERLAY')return {name:'shoot',key:`${match.id}:${match.round}:shoot`};
  if(match.phase!=='HAND_SHAKE')return null;
  const beat=Math.min(2,Math.max(0,Math.floor((now-match.phaseAt)/(CONFIG.timing.shake/3))));
  return {name:CUES[beat],key:`${match.id}:${match.round}:${beat}`};
}
export class CueTracker {
  constructor(){this.reset();}
  reset(){this.roundKey=null;this.seen=new Set();}
  take(match,now){
    const roundKey=match?`${match.id}:${match.round}`:null;
    if(roundKey!==this.roundKey){this.seen.clear();this.roundKey=roundKey;}
    const cue=currentCue(match,now);if(!cue||this.seen.has(cue.key))return null;
    this.seen.add(cue.key);return cue;
  }
}
export class Announcer {
  constructor({fetcher=(...args)=>fetch(...args),fallback=()=>{}}={}){
    this.fetcher=fetcher;this.fallback=fallback;this.buffers=new Map();this.sources=new Set();this.enabled=true;this.volume=.6;
  }
  unlock(ctx){
    if(!ctx)return;this.ctx=ctx;
    this.loading??=Promise.all(CUES.map(async cue=>{
      try {const response=await this.fetcher(ANNOUNCER_ASSETS[cue]);if(!response.ok)return;const buffer=await ctx.decodeAudioData(await response.arrayBuffer());this.buffers.set(cue,buffer);}catch{/* Optional audio never blocks gameplay. */}
    }));return this.loading;
  }
  configure(enabled,volume){this.enabled=enabled;this.volume=volume;if(!enabled||!volume)this.stop();}
  stop(){for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
  play(cue){
    if(!this.enabled||!this.volume||!CUES.includes(cue)||this.ctx?.state!=='running')return false;
    this.stop();const buffer=this.buffers.get(cue);
    if(!buffer){this.fallback(cue,this.volume);return false;}
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=this.volume*.55;
    source.connect(gain);gain.connect(this.ctx.destination);this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};source.start();return true;
  }
}
