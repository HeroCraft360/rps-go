import test from 'node:test';
import assert from 'node:assert/strict';
import { Announcer, CueTracker, currentCue } from '../src/ui/announcer.js';
import { Sound } from '../src/ui/sound.js';
import { synthesizeSfx, SFX_DESIGNS } from '../src/ui/sfx-design.js';
import { AUDIO_CONFIG, CUES, ANNOUNCER_VOICES } from '../src/ui/audio-config.js';
import { CONFIG } from '../src/config.js';
import { Match } from '../src/core/match.js';
import { defaultSave, persistSave, loadSave } from '../src/core/storage.js';

function audioContext() {
  const sources=[],gains=[];
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
  const source=()=>{const node={frequency:param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(at){if(at===undefined)this.stopped=true;else this.stopAt=at;},end(){this.onended?.();}};sources.push(node);return node;};
  return {state:'running',currentTime:10,sampleRate:48000,destination:{},sources,gains,
    createBufferSource:source,createOscillator:source,
    createGain(){const node={gain:param(),connect(){},disconnect(){this.disconnected=true;}};gains.push(node);return node;},
    createBuffer(channels,length,rate){const data=new Float32Array(length);return {duration:length/rate,getChannelData:()=>data};},
    async decodeAudioData(){return {duration:.2};},async resume(){this.state='running';}};
}
const ok=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});

test('announcer caches four optional previews without requesting missing spoken paths',async()=>{
  const urls=[],ctx=audioContext(),a=new Announcer({fetcher:async url=>{urls.push(url);return ok();}});
  await a.unlock(ctx);await a.unlock(ctx);
  assert.equal(urls.length,4);assert.ok(urls.every(url=>url.endsWith('-preview.wav')));
  assert.ok(Object.values(ANNOUNCER_VOICES).every(url=>url===null));
  assert.equal(a.loadedKinds.get('shoot'),'preview');
  for(const cue of CUES) assert.equal(a.play(cue),true);
  assert.equal(a.sources.size,1);assert.equal(ctx.sources.filter(s=>s.stopped).length,3);
  assert.equal(ctx.sources.at(-1).stopAt,10+CONFIG.timing.shoot/1000);
  a.stop();assert.ok(ctx.sources.every(s=>s.disconnected));assert.equal(a.gains.size,0);
});

test('supplied voice is preferred, missing/decode-failed voice falls back per cue',async()=>{
  const ctx=audioContext(),urls=[];
  const a=new Announcer({voices:{rock:'rock-voice',paper:'missing',scissors:'corrupt'},fetcher:async url=>{urls.push(url);if(url==='missing')return {ok:false};return {ok:true,arrayBuffer:async()=>url};}});
  ctx.decodeAudioData=async data=>{if(data==='corrupt')throw Error('decode');return {duration:.2};};
  await a.unlock(ctx);assert.equal(a.loadedKinds.get('rock'),'voice');assert.equal(a.loadedKinds.get('paper'),'preview');assert.equal(a.loadedKinds.get('scissors'),'preview');assert.equal(urls.filter(u=>u.endsWith('rock-preview.wav')).length,0);
});

test('hung fetch/decode time out; late decoding never replays or replaces fallback',async()=>{
  const ctx=audioContext();let finish;
  ctx.decodeAudioData=()=>new Promise(resolve=>{finish=resolve;});
  const a=new Announcer({fetcher:ok,timeoutMs:10});
  await a.unlock(ctx);assert.equal(a.buffers.size,0);assert.equal(a.controllers.size,0);
  finish({duration:.2});await Promise.resolve();assert.equal(a.buffers.size,0);assert.equal(ctx.sources.length,0);
  a.play('rock');assert.equal(a.sources.size,1);assert.equal(ctx.sources[0].stopAt,10.13);
  a.configure(false,.6);assert.equal(a.sources.size,0);assert.ok(ctx.sources[0].stopped);
  const b=new Announcer({fetcher:()=>new Promise(()=>{}),timeoutMs:10});await b.unlock(ctx);assert.equal(b.buffers.size,0);
});

test('mute and independent volume changes affect active channels immediately',async()=>{
  const ctx=audioContext(),a=new Announcer({fetcher:ok}),s=new Sound({contextFactory:()=>ctx});
  await s.ready;s.unlock();await a.unlock(ctx);a.play('shoot');s.play('shoot');
  const voice=[...a.gains.values()][0],effect=[...s.active][0].gain;
  a.configure(true,.2);assert.equal(voice.gain.value,.2*AUDIO_CONFIG.announcerGain);assert.equal(effect.gain.value,.7*AUDIO_CONFIG.sfxGain);
  s.configure(true,.4);assert.equal(effect.gain.value,.4*AUDIO_CONFIG.sfxGain);assert.equal(voice.gain.value,.2*AUDIO_CONFIG.announcerGain);
  s.configure(true,0);assert.equal(s.active.size,0);assert.equal(a.sources.size,1);
  a.configure(false,.6);assert.equal(a.sources.size,0);assert.equal(a.play('shoot'),false);assert.equal(s.play('shoot'),false);
});

test('fallback oscillator is independent of zero SFX volume and stops on navigation/background',async()=>{
  const ctx=audioContext(),a=new Announcer({fetcher:async()=>{throw Error('offline');}}),s=new Sound({contextFactory:()=>ctx});
  s.unlock();s.configure(true,0);await a.unlock(ctx);a.play('paper');assert.equal(a.sources.size,1);assert.equal(s.active.size,0);
  a.suspend(true);assert.equal(a.sources.size,0);assert.equal(a.play('paper'),false);
  a.suspend(false);assert.equal(a.sources.size,0);a.play('rock');a.stop();assert.equal(a.sources.size,0);
});

test('SFX cache is reused, polyphony bounded, ended and stopped nodes disconnect',async()=>{
  const ctx=audioContext(),s=new Sound({contextFactory:()=>ctx});await s.ready;s.unlock();const cached=s.buffers.get('shoot');s.unlock();assert.equal(s.buffers.get('shoot'),cached);
  for(let i=0;i<40;i++)s.play('shoot');assert.equal(s.active.size,AUDIO_CONFIG.maxSfxGroups);
  assert.ok(ctx.sources.slice(0,-AUDIO_CONFIG.maxSfxGroups).every(n=>n.stopped&&n.disconnected));
  for(const entry of [...s.active])entry.source.end();assert.equal(s.active.size,0);
  s.play('win');s.suspend(true);assert.equal(s.active.size,0);assert.equal(s.play('loss'),false);s.suspend(false);assert.equal(s.active.size,0);
  for(let i=0;i<50;i++){s.play('lock');s.stop();}assert.equal(s.active.size,0);
});

test('blocked or unsupported audio never queues playback or throws',async()=>{
  const s=new Sound({contextFactory:()=>{throw Error('unsupported');}});s.unlock();assert.equal(s.play('shoot'),false);
  const ctx=audioContext(),a=new Announcer({fetcher:ok});await a.unlock(ctx);ctx.state='suspended';assert.equal(a.play('shoot'),false);ctx.state='running';assert.equal(ctx.sources.length,0);
  const broken=new Sound({contextFactory:()=>ctx});broken.unlock();ctx.state='suspended';assert.equal(broken.play('shoot'),false);
  a.configure(true,NaN);assert.equal(a.volume,0);broken.configure(true,2);assert.equal(broken.volume,1);
});

test('original SFX are deterministic, distinct, short, finite, fade to zero and fit conservative mix headroom',()=>{
  const fingerprints=new Set();
  for(const name of Object.keys(SFX_DESIGNS)){
    const samples=synthesizeSfx(name,48000);assert.deepEqual(synthesizeSfx(name,48000),samples);
    let peak=0;for(const v of samples){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
    assert.ok(peak>.01&&peak<=.160001,name);assert.ok(samples.length/48000<.7,name);assert.equal(samples.at(-1),0);
    fingerprints.add(samples.slice(100,200).join(','));
  }
  assert.equal(fingerprints.size,Object.keys(SFX_DESIGNS).length);
  assert.ok(AUDIO_CONFIG.maxSfxGroups*.160001*AUDIO_CONFIG.sfxGain+AUDIO_CONFIG.announcerGain<1);
});

function game({deadline=false,player='rock',opponent='scissors'}={}) {
  let now=0;const m=new Match({clock:()=>now,rng:()=>.5,bot:{planRound:()=>({readyAfterMs:deadline?Infinity:9000,tell:null}),choose:()=>opponent}});
  const tick=ms=>{now+=ms;m.update();};m.start();tick(CONFIG.timing.intro);
  if(deadline)tick(CONFIG.roundMs);else {m.select(player);m.confirm();tick(2000);}
  return {m,tick,now:()=>now};
}
for(const deadline of [false,true])test(`actual ${deadline?'deadline':'early-ready'} phases map each cue once without timing changes`,()=>{
  const {m,tick,now}=game({deadline}),tracker=new CueTracker();
  if(!deadline){assert.equal(m.phase,'BOTH_READY');assert.equal(tracker.take(m,now()),null);tick(CONFIG.timing.bothReady);}
  else assert.equal(m.phase,'HAND_SHAKE');
  for(const cue of ['rock','paper','scissors']){assert.equal(tracker.take(m,now()).name,cue);assert.equal(tracker.take(m,now()),null);tick(AUDIO_CONFIG.beatMs);}
  assert.equal(m.phase,'SHOOT_OVERLAY');assert.equal(tracker.take(m,now()).name,'shoot');tick(CONFIG.timing.shoot);assert.equal(m.phase,'REVEAL');assert.equal(tracker.take(m,now()),null);
});

test('hidden beats are consumed, ties/new rounds/rematches reset dedup without retaining old matches',()=>{
  const {m,tick,now}=game({player:'rock',opponent:'rock'}),t=new CueTracker();tick(CONFIG.timing.bothReady);
  assert.equal(t.take(m,now()).name,'rock');tick(AUDIO_CONFIG.beatMs*2);t.skip(m,now());assert.equal(t.take(m,now()),null);
  tick(AUDIO_CONFIG.beatMs);assert.equal(t.take(m,now()).name,'shoot');tick(CONFIG.timing.shoot);assert.equal(m.result,'tie');
  tick(CONFIG.timing.reveal);tick(CONFIG.timing.result);tick(CONFIG.timing.intro);m.select('paper');m.confirm();tick(2000);tick(CONFIG.timing.bothReady);
  assert.equal(t.take(m,now()).name,'rock');assert.equal(t.seen.size,1);
  const next=game();next.tick(CONFIG.timing.bothReady);assert.equal(t.take(next.m,next.now()).name,'rock');assert.equal(t.seen.size,1);
  assert.equal(currentCue({...next.m,phase:'HAND_SHAKE',phaseAt:0,reducedMotion:true},450).name,'paper');
});

test('audio settings persist without changing progress, inventories or tutorial status',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const save=defaultSave();Object.assign(save,{coins:888,tutorialSeen:true,ownedSkinIds:['classic','neon-circuit'],equippedSkinId:'neon-circuit'});
  Object.assign(save.settings,{sound:false,sfxVolume:.25,announcerVolume:.85,reducedMotion:true});persistSave(storage,save);
  assert.deepEqual(loadSave(storage),save);
});
