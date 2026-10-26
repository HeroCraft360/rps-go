// Copies the actual game into ignored output. Only this copy receives QA controls.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url),out=new URL('output/part3-review/',root);
await mkdir(out,{recursive:true});
for(const path of ['index.html','src','assets','.nojekyll'])await cp(new URL(path,root),new URL(path,out),{recursive:true});
let main=await readFile(new URL('src/main.js',out),'utf8');
main=main.replace("import { Match } from './core/match.js';","import { Match, reviewStorage, reviewNow, reviewRevision, installReviewControls } from './review-match.js';")
  .replace('storage = window.localStorage','storage = reviewStorage')
  .replace('function loop(now) {','let lastReviewFrame;\nfunction loop(now) {\n now=reviewNow();const reviewFrame=now+":"+reviewRevision();if(reviewFrame===lastReviewFrame){frame=requestAnimationFrame(loop);return;}lastReviewFrame=reviewFrame;');
await writeFile(new URL('src/main.js',out),main+'\ninstallReviewControls({start,home});\n');
await writeFile(new URL('src/review-match.js',out),`
import { Match as RealMatch } from './core/match.js';
import { CONFIG } from './config.js';
import { defaultSave, SAVE_KEY } from './core/storage.js';
import { handAssets } from './render/hand-assets.js';
const saved=defaultSave();saved.coins=5000;saved.tutorialSeen=true;saved.settings.sound=false;
const key='rpsgo.part3.isolated-review';
export const reviewStorage={getItem:k=>k===SAVE_KEY?(sessionStorage.getItem(key)||JSON.stringify(saved)):null,setItem:(k,v)=>sessionStorage.setItem(key,v),removeItem:()=>sessionStorage.removeItem(key)};
let current,clock=1000,revision=0;
export const reviewNow=()=>clock;
export const reviewRevision=()=>revision;
document.addEventListener('click',()=>revision++);document.addEventListener('change',()=>revision++);handAssets.load().then(()=>revision++);
export class Match extends RealMatch {
 constructor(){const plan=document.querySelector('#qa-plan')?.value;const actual=document.querySelector('#qa-byte')?.value||'scissors';super({clock:()=>clock,rng:()=>.5,bot:{planRound:()=>({tell:'paper',tellAfterMs:1000,readyAfterMs:plan==='deadline'?Infinity:9000}),choose:()=>actual}});current=this;}
 step(ms){clock+=ms;this.update();revision++;}
}
export function installReviewControls({start,home}){
 const bar=document.createElement('aside');bar.style.cssText='padding:20px;display:flex;flex-wrap:wrap;gap:12px;font:14px monospace;background:#10183b';bar.setAttribute('aria-label','Isolated Part 3 review controls');
 bar.innerHTML='<label>BYTE actual <select id="qa-byte"><option>scissors</option><option>paper</option><option>rock</option></select></label><label>Plan <select id="qa-plan"><option value="normal">9s lock</option><option value="deadline">Deadline</option></select></label><button id="qa-start">START CLAIM</button><button id="qa-second">+1 SECOND</button><button id="qa-ready">ADVANCE READY</button><button id="qa-shake">SHAKE</button><button id="qa-shoot">SHOOT BEAT</button><button id="qa-flash">VFX FRAME</button><button id="qa-reveal">REVEAL</button><button id="qa-exit">FINISH EXIT</button><button id="qa-next">NEXT ROUND</button><button id="qa-home">HOME</button><output id="qa-state"></output>';
 document.body.append(bar);
 const report=()=>{document.querySelector('#qa-state').textContent=current?.phase+' · '+current?.remaining+'s';window.scrollTo(0,0);revision++;};
 document.querySelector('#qa-start').onclick=()=>{start();current.step(CONFIG.timing.intro);current.step(1000);report();};
 for(const [id,ms] of [['second',1000],['ready',2000],['shake',CONFIG.timing.bothReady],['shoot',CONFIG.timing.shake],['flash',90],['reveal',CONFIG.timing.shoot],['exit',CONFIG.timing.bluffExit]])document.querySelector('#qa-'+id).onclick=()=>{current.step(ms);report();};
 document.querySelector('#qa-next').onclick=()=>{current.step(CONFIG.timing.reveal);current.step(CONFIG.timing.result);current.step(CONFIG.timing.intro);report();};
 document.querySelector('#qa-home').onclick=()=>{home();report();};
 new MutationObserver(()=>{
  const modal=document.querySelector('#modal');if(modal.open&&modal.dataset.type==='bluff'&&!modal.querySelector('#qa-deadline')){
   const box=document.createElement('div');box.innerHTML='<button id="qa-lock">QA: BYTE LOCK</button> <button id="qa-deadline">QA: DEADLINE</button>';
   modal.append(box);box.querySelector('#qa-lock').onclick=()=>{current.step(8000);box.remove();report();};box.querySelector('#qa-deadline').onclick=()=>{current.step(20000);box.remove();report();};
  }
  if(!modal.open)modal.querySelector('#qa-deadline')?.parentElement.remove();
 }).observe(document.querySelector('#modal'),{attributes:true,attributeFilter:['open']});
}
`);
console.log('Isolated QA: http://127.0.0.1:8000/output/part3-review/');
