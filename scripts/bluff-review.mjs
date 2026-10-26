// Isolated real-game review copy: injected clock/bot, in-memory save, no production controls.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('output/bluff-review/',root);
await mkdir(out,{recursive:true});
for(const path of ['index.html','src','assets','.nojekyll'])await cp(new URL(path,root),new URL(path,out),{recursive:true});
let main=await readFile(new URL('src/main.js',out),'utf8');
main=main.replace("import { Match } from './core/match.js';","import { Match, reviewStorage, reviewNow, installReviewControls } from './review-match.js';")
  .replace('storage = window.localStorage','storage = reviewStorage').replace('function loop(now) {','let lastReviewNow;\nfunction loop(now) {\n  now=reviewNow();\n  if(now===lastReviewNow){frame=requestAnimationFrame(loop);return;}\n  lastReviewNow=now;');
await writeFile(new URL('src/main.js',out),main+'\ninstallReviewControls({start,home});\n');
await writeFile(new URL('src/review-match.js',out),`
import { Match as RealMatch } from './core/match.js';
import { CONFIG } from './config.js';
import { defaultSave, SAVE_KEY } from './core/storage.js';
const saved=defaultSave();saved.tutorialSeen=true;saved.settings={sound:false,reducedMotion:false};
const memory=new Map([[SAVE_KEY,JSON.stringify(saved)]]);
export const reviewStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let current,claim='paper';
export const reviewNow=()=>current?.reviewClock.now??performance.now();
export class Match extends RealMatch {
  constructor(){const clock={now:performance.now()},chosen=claim;super({clock:()=>clock.now,rng:()=>.5,bot:{planRound:()=>({tell:chosen,tellAfterMs:1000,readyAfterMs:4000}),choose:()=> 'scissors'}});this.reviewClock=clock;current=this;}
  step(ms){this.reviewClock.now+=ms;this.update();}
}
export function installReviewControls({start,home}){
  const bar=document.createElement('aside');bar.style.cssText='padding:20px;display:flex;flex-wrap:wrap;gap:12px;font:14px monospace;background:#10183b';
  bar.setAttribute('aria-label','Isolated notification review controls');
  bar.innerHTML='<label>Public claim <select id="qa-claim"><option>paper</option><option>rock</option><option>scissors</option></select></label><button id="qa-start">START CLAIM</button><button id="qa-second">+1 SECOND</button><button id="qa-ready">BOTH READY</button><button id="qa-shake">SHAKE</button><button id="qa-shoot">SHOOT BEAT</button><button id="qa-reveal">REVEAL</button><button id="qa-exit">FINISH EXIT</button><button id="qa-home">HOME</button><output id="qa-state"></output>';
  document.body.append(bar);
  const report=()=>{document.querySelector('#qa-state').textContent=current.phase+' · '+current.remaining+'s · public claim '+claim;window.scrollTo(0,0);};
  document.querySelector('#qa-start').onclick=()=>{claim=document.querySelector('#qa-claim').value;start();current.step(CONFIG.timing.intro);current.step(1000);report();};
  document.querySelector('#qa-ready').onclick=()=>{current.select('rock');current.confirm();current.step(3000);report();};
  for(const [id,ms] of [['second',1000],['shake',CONFIG.timing.bothReady],['shoot',CONFIG.timing.shake],['reveal',CONFIG.timing.shoot],['exit',CONFIG.timing.bluffExit]])document.querySelector('#qa-'+id).onclick=()=>{current.step(ms);report();};
  document.querySelector('#qa-home').onclick=home;
}
`);
console.log('Review at http://127.0.0.1:8000/output/bluff-review/');
