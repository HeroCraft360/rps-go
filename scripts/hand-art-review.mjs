// Generates an isolated copy of the actual game for repeatable screenshot QA.
// Never included by build.mjs. Does not read or write the player's localStorage.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url),output=new URL('output/hand-art-review/',root);
await mkdir(output,{recursive:true});
for(const file of ['index.html','src','assets','.nojekyll'])await cp(new URL(file,root),new URL(file,output),{recursive:true});
let main=await readFile(new URL('src/main.js',output),'utf8');
main=main.replace("import { Match } from './core/match.js';","import { Match, reviewStorage, installReviewControls } from './review-match.js';")
  .replace('storage = window.localStorage','storage = reviewStorage');
await writeFile(new URL('src/main.js',output),main+'\ninstallReviewControls({start,home});\n');
await writeFile(new URL('src/review-match.js',output),`
import { Match as RealMatch } from './core/match.js';
import { CONFIG } from './config.js';
import { defaultSave, SAVE_KEY } from './core/storage.js';
import { handAssets } from './render/hand-assets.js';
const saved=defaultSave();saved.tutorialSeen=true;saved.settings={sound:false,reducedMotion:true};
saved.coins=2000;saved.ownedSkinIds=['classic','neon-circuit','solar-flare'];
const memory=new Map([[SAVE_KEY,JSON.stringify(saved)]]);
export const reviewStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
if(new URLSearchParams(location.search).get('art')==='failed')handAssets.createImage=()=>{throw Error('QA asset failure');};
let current,byteMove='rock';
export class Match extends RealMatch {
  constructor(){
    const clock={now:performance.now()};const lockedByte=byteMove;
    super({clock:()=>clock.now,rng:()=>.5,bot:{planRound:()=>({readyAfterMs:4000,tell:null}),choose:()=>lockedByte}});
    this.reviewClock=clock;current=this;
  }
  step(ms){this.reviewClock.now+=ms;this.update();}
}
export function installReviewControls({start,home}){
  const bar=document.createElement('aside');bar.style.cssText='padding:18px;background:#080d25;color:white;font:14px monospace;display:flex;gap:12px;flex-wrap:wrap;align-items:center;border-top:2px solid #9b7aff';
  bar.setAttribute('aria-label','Isolated artwork review controls');
  const options=['rock','paper','scissors'].map(move=>'<option>'+move+'</option>').join('');
  bar.innerHTML='<strong>ARTWORK QA · isolated save / controlled reveal</strong><label>BYTE <select id="review-byte">'+options+'</select></label><label>Player <select id="review-player">'+options+'</select></label><button id="review-reveal">SHOW REVEAL</button><button id="review-home">HOME SHOWCASE</button><output id="review-state"></output>';
  document.body.append(bar);
  document.querySelector('#review-reveal').onclick=()=>{
    byteMove=document.querySelector('#review-byte').value;start();
    current.step(CONFIG.timing.intro);current.select(document.querySelector('#review-player').value);current.confirm();
    for(const ms of [4000,CONFIG.timing.bothReady,CONFIG.timing.shake,CONFIG.timing.shoot])current.step(ms);
    window.scrollTo(0,0);
  };
  document.querySelector('#review-home').onclick=()=>{home();window.scrollTo(0,0);};
  handAssets.load().then(state=>document.querySelector('#review-state').textContent='Artwork: '+state);
}
`);
console.log('Review copy generated. With the source preview server running, open http://127.0.0.1:8000/output/hand-art-review/');
