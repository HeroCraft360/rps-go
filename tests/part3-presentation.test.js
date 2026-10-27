import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { HAND_ART,handArtId } from '../src/render/hand-assets.js';
import { drawArenaHand,drawHomeHand,paintIcon } from '../src/render/hands.js';
import { effectFrame,drawEffects } from '../src/render/effects.js';
import { Announcer,CueTracker,ANNOUNCER_ASSETS } from '../src/ui/announcer.js';
import { defaultSave,validateSave } from '../src/core/storage.js';
import { roundHistory } from '../src/ui/round-history.js';

test('six approved Classic and BYTE PNG bytes remain identical to merged main',async()=>{
  const hashes=JSON.parse(await readFile(new URL('./approved-hand-hashes.json',import.meta.url)));
  assert.equal(Object.keys(hashes).length,6);
  for(const [path,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(await readFile(new URL('../'+path,import.meta.url))).digest('hex'),hash,path);
});
test('all four local preview cues are nonempty PCM WAV files',async()=>{
  for(const url of Object.values(ANNOUNCER_ASSETS)){
    const wav=await readFile(new URL(url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt32LE(24),22050);assert.ok(wav.length>1000);assert.equal(wav.readUInt32LE(4),wav.length-8);
  }
});

test('all six premium poses map to distinct 768px RGBA files and shared arena/home/icon draws',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../assets/hands/part3/manifest.json',import.meta.url)));
  for(const item of manifest.sprites){
    assert.equal(handArtId(item.move,item.skin),item.id);const art=HAND_ART[item.id];assert.deepEqual(art.bounds,item.bounds);
    const png=await readFile(new URL(art.url));assert.equal(png.readUInt32BE(16),768);assert.equal(png.readUInt32BE(20),768);assert.equal(png[25],6);
    const calls=[],image={},assets={get:(move,skin)=>{assert.equal(move,item.move);assert.equal(skin,item.skin);return image;}};
    const c={drawImage:(...a)=>calls.push(a),clearRect(){},scale(){throw Error('PNG mirrored');}};
    drawArenaHand(c,{move:item.move,skin:item.skin},assets);drawHomeHand(c,{pose:item.move,skin:item.skin},assets);paintIcon({width:180,height:180,getContext:()=>c},item.move,item.skin,assets);
    assert.equal(calls.length,3);assert.ok(calls.every(a=>a[0]===image));assert.equal(c.imageSmoothingEnabled,false);
    const [x,y,r,b]=art.bounds;assert.ok(x>0&&r<768&&y>=108&&b<=659);
  }
});
test('cinematic effects are deterministic, bounded, clock-driven and absent when reduced or outside sequence',()=>{
  const m={phase:'SHOOT_OVERLAY',phaseAt:1000};const f=effectFrame(m,1100);assert.deepEqual(effectFrame(m,1100),f);assert.ok(f.particles<=48);assert.ok(Math.abs(f.shakeX)<=2&&Math.abs(f.shakeY)<=1.2);
  assert.equal(effectFrame(m,1100,{reduced:true}),null);assert.ok(effectFrame(m,1100,{lowPower:true}).particles< f.particles);
  assert.equal(effectFrame({...m,phase:'CHOOSING'},1100),null);assert.equal(effectFrame(null,1100),null);
  assert.equal(effectFrame({...m,phase:'REVEAL'},5000).energy,0);
  const c={save(){},restore(){},fillRect(){},beginPath(){},ellipse(){},stroke(){},moveTo(){},lineTo(){}};drawEffects(c,f);drawEffects(c,f,true);
});
test('cue tracker plays each actual beat once, skips missed beats, resets on next match and caps memory per round',()=>{
  const t=new CueTracker(),m={id:'a',round:1,phase:'HAND_SHAKE',phaseAt:0};assert.equal(t.take(m,0).name,'rock');assert.equal(t.take(m,10),null);assert.equal(t.take(m,950).name,'scissors');assert.equal(t.take(m,1000),null);
  m.phase='SHOOT_OVERLAY';assert.equal(t.take(m,1350).name,'shoot');assert.equal(t.take(m,1400),null);m.phase='REVEAL';assert.equal(t.take(m,2100),null);
  m.round=2;m.phase='HAND_SHAKE';m.phaseAt=3000;assert.equal(t.take(m,3000).name,'rock');assert.equal(t.seen.size,1);
  t.take(null,3100);m.id='b';assert.equal(t.take(m,3000).name,'rock');
});
test('announcer handles preload failure, silence, bounded polyphony and abort without replaying late loads',async()=>{
  let fallbacks=0,starts=0,stops=0;const a=new Announcer({fetcher:async()=>{throw Error('missing');},fallback:()=>fallbacks++});
  const ctx={state:'running',currentTime:0,destination:{},createBufferSource:()=>({connect(){},disconnect(){},start(){starts++;},stop(at){if(at===undefined)stops++;}}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};
  await a.unlock(ctx);assert.equal(a.play('rock'),false);assert.equal(fallbacks,1);assert.equal(starts,0);
  a.buffers.set('rock',{});a.buffers.set('paper',{});a.play('rock');a.play('paper');assert.equal(starts,2);assert.equal(stops,1);assert.equal(a.sources.size,1);
  a.configure(false,.6);assert.equal(a.sources.size,0);assert.equal(a.play('rock'),false);a.configure(true,0);assert.equal(a.play('rock'),false);
  assert.equal(starts,2);assert.equal(a.play('invalid'),false);
});
test('additive volume validation preserves legacy inventory and preferences without requiring a new save key',()=>{
  const old={...defaultSave(),coins:991,ownedSkinIds:['classic','solar-flare'],equippedSkinId:'solar-flare',settings:{sound:false,reducedMotion:true}};
  const save=validateSave(old);assert.equal(save.coins,991);assert.equal(save.equippedSkinId,'solar-flare');assert.equal(save.settings.sound,false);assert.equal(save.settings.reducedMotion,true);assert.equal(save.settings.announcerVolume,.6);
  const bad=validateSave({...old,settings:{sfxVolume:4,announcerVolume:-2}});assert.equal(bad.settings.sfxVolume,1);assert.equal(bad.settings.announcerVolume,0);
  assert.equal(validateSave({...old,settings:{sfxVolume:NaN}}).settings.sfxVolume,.7);
});
test('history UI labels public claims and actual revealed moves without causal assertions',()=>{
  assert.match(roundHistory([]),/No completed rounds/);const html=roundHistory([{round:7,player:'rock',opponent:'paper',playerClaim:'scissors',opponentClaim:'rock',result:'opponent',playerAutoPick:true}]);
  for(const s of ['ROUND 7','LOSS','YOU: ROCK','BYTE: PAPER','YOUR CLAIM: SCISSORS','BYTE CLAIM: ROCK','AUTO PICK'])assert.ok(html.includes(s));
});
