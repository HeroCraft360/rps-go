import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HAND_ART, HandAssetCache, handArtId } from '../src/render/hand-assets.js';
import { ARENA_HAND_LAYOUT, HOME_HAND_LAYOUT, drawArenaHand, drawHomeHand, paintIcon } from '../src/render/hands.js';

function loader() {
  const images=[];const cache=new HandAssetCache({timeoutMs:100,createImage:()=>{const image={naturalWidth:768,naturalHeight:768};images.push(image);return image;}});
  return {cache,images};
}
function context() {
  const calls=[];return {calls,imageSmoothingEnabled:true,...Object.fromEntries(['drawImage','save','restore','translate','scale','clearRect'].map(name=>[name,(...args)=>calls.push([name,...args])]))};
}
test('six mappings agree with the supplied manifest and shipped PNG dimensions',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../assets/hands/manifest.json',import.meta.url),'utf8'));
  assert.equal(Object.keys(HAND_ART).length,6);
  for(const item of manifest.sprites){
    assert.equal(handArtId(item.move,item.side==='byte'?'byte':'classic'),item.id);
    assert.deepEqual(HAND_ART[item.id].bounds,item.art_alpha_bounds_in_runtime);
    const png=await readFile(new URL(HAND_ART[item.id].url));
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),768);assert.equal(png.readUInt32BE(20),768);assert.equal(png[25],6);
    assert.match(HAND_ART[item.id].url,/assets\/hands\/phase2a\//);
  }
});
test('alternate skin IDs and invalid moves never map to the default orange art',()=>{
  for(const move of ['rock','paper','scissors'])for(const skin of ['neon-circuit','solar-flare','unknown'])assert.equal(handArtId(move,skin),null);
  assert.equal(handArtId('invalid','classic'),null);
});
test('loader exposes idle/loading/ready and caches one asynchronous load',async()=>{
  const {cache,images}=loader();assert.equal(cache.state,'idle');assert.equal(cache.get('rock','byte'),null);
  const result=cache.load();assert.equal(cache.state,'loading');assert.equal(cache.load(),result);assert.equal(images.length,6);
  for(const image of images)image.onload();assert.equal(await result,'ready');
  assert.equal(cache.get('rock','byte'),images[0]);assert.equal(cache.get('paper','classic'),images[4]);
});
test('one failed image degrades independently; malformed dimensions fall back',async()=>{
  const {cache,images}=loader(),result=cache.load();images[0].onerror();images[1].naturalWidth=0;images[1].onload();
  images.slice(2).forEach(image=>image.onload());assert.equal(await result,'degraded');
  assert.equal(cache.get('rock','byte'),null);assert.equal(cache.get('paper','byte'),null);assert.ok(cache.get('rock','classic'));
});
test('image factory failure and network timeout settle safely; late callbacks cannot resurrect an error',async()=>{
  const failed=new HandAssetCache({createImage:()=>{throw Error('Image unavailable');}});assert.equal(await failed.load(),'error');
  let late;const timeout=new HandAssetCache({timeoutMs:1,createImage:()=>{const image={naturalWidth:768,naturalHeight:768,set src(_){late=image.onload;}};return image;}});
  assert.equal(await timeout.load(),'error');late();assert.equal(timeout.state,'error');assert.equal(timeout.get('rock','classic'),null);
});
test('all six approved arena poses use positive square draws, correct sides, and no mirror',()=>{
  for(const side of ['byte','player'])for(const move of ['rock','paper','scissors']){
    const c=context(),image={},skin=side==='byte'?'byte':'classic',p=ARENA_HAND_LAYOUT[side];
    assert.equal(drawArenaHand(c,{side,skin,move,bounce:4},{get:()=>image}),'approved');
    assert.deepEqual(c.calls,[['drawImage',image,p.x,p.y+4,p.size,p.size]]);assert.equal(c.imageSmoothingEnabled,false);
    const [x,y,r,b]=HAND_ART[handArtId(move,skin)].bounds,scale=p.size/768;
    assert.ok(p.x+x*scale>=0&&p.x+r*scale<=480);assert.ok(p.y+y*scale-2>=0&&p.y+b*scale+2<=205);
  }
});
test('loading/error arena draws preserve the exact procedural skin and legacy BYTE orientation',()=>{
  for(const side of ['byte','player'])for(const skin of side==='byte'?['byte']:['classic','neon-circuit','solar-flare']){
    const c=context(),image={};let request;
    assert.equal(drawArenaHand(c,{side,skin,move:'scissors'},{get:()=>null},(...args)=>{request=args;return image;}),'procedural');
    assert.deepEqual(request,['scissors',skin]);assert.equal(c.calls.some(a=>a[0]==='scale'),side==='byte');assert.ok(c.calls.some(a=>a[0]==='drawImage'&&a[1]===image));
  }
});
test('home preview uses the same approved image; all complete poses fit above the pedestal',()=>{
  const p=HOME_HAND_LAYOUT;
  for(const pose of ['rock','paper','scissors']){
    const c=context(),image={};let request;
    drawHomeHand(c,{pose,skin:'classic',bob:3},{get:(...args)=>{request=args;return image;}});
    assert.deepEqual(request,[pose,'classic']);assert.deepEqual(c.calls,[['drawImage',image,p.x,p.y+3,p.size,p.size]]);
    const [x,y,r,b]=HAND_ART[`player_${pose}`].bounds,s=p.size/768;assert.ok(p.x+x*s>=0&&p.x+r*s<=640);assert.ok(p.y+y*s-3>=0&&p.y+b*s+3<277);
  }
  const c=context();let skin;drawHomeHand(c,{skin:'solar-flare',pose:'paper'},{get:()=>null},(_,id)=>{skin=id;return {};});assert.equal(skin,'solar-flare');
});
test('icons preserve approved aspect ratio and delegate alternate/error skins unchanged',()=>{
  const c=context(),canvas={width:70,height:88,getContext:()=>c},image={};paintIcon(canvas,'paper','classic',{get:()=>image});
  const draw=c.calls.find(a=>a[0]==='drawImage');assert.equal(draw[1],image);assert.equal(draw[8]/draw[9],draw[4]/draw[5]);assert.equal(c.imageSmoothingEnabled,false);
  let request;paintIcon(canvas,'rock','neon-circuit',{get:()=>null},(...args)=>{request=args;});assert.deepEqual(request,[canvas,'rock','neon-circuit']);
});
