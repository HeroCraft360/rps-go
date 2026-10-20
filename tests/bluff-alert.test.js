import test from 'node:test';
import assert from 'node:assert/strict';
import { BluffAlert } from '../src/ui/bluff-alert.js';
import { CONFIG } from '../src/config.js';

function fixture() {
  const root={hidden:true,innerHTML:'',open:false,querySelector:()=>({}),showPopover(){this.open=true;},hidePopover(){this.open=false;},matches(){return this.open;}};
  const announce={textContent:''},sounds=[],painted=[];
  const alert=new BluffAlert(root,announce,{play:value=>sounds.push(value)},(_,move,skin)=>painted.push([move,skin]));
  return {alert,root,announce,sounds,painted};
}
test('incoming alert renders only the public claim, never reads hidden truth, and expires',()=>{
  const {alert,root,announce,sounds,painted}=fixture();
  alert.show({type:'PUBLIC_TELL',actor:'opponent',move:'paper',at:100,get lockedMove(){throw Error('private');},get isLie(){throw Error('private');}},100);
  assert.equal(root.hidden,false);assert.equal(root.open,true);
  assert.match(root.innerHTML,/BYTE WILL CHOOSE/);assert.match(root.innerHTML,/<strong>PAPER<\/strong>/);assert.match(root.innerHTML,/It's a lieeeeee/);
  assert.match(announce.textContent,/publicly claims paper/);assert.deepEqual(sounds,['bluff']);assert.deepEqual(painted,[['paper','byte']]);
  alert.update(100+CONFIG.timing.bluffAlert-1,true);assert.equal(root.hidden,false);
  alert.update(100+CONFIG.timing.bluffAlert,true);assert.equal(root.hidden,true);assert.equal(root.open,false);
});
test('stale, local and readiness events cannot launch an incoming bluff alert',()=>{
  const {alert,root,sounds}=fixture();
  for(const event of [{type:'READY',actor:'opponent',move:'rock',at:0},{type:'PUBLIC_TELL',actor:'player',move:'rock',at:0}]) alert.show(event,0);
  alert.show({type:'PUBLIC_TELL',actor:'opponent',move:'rock',at:0},CONFIG.timing.bluffAlert+1);
  assert.equal(root.hidden,true);assert.deepEqual(sounds,[]);
});
test('round resolution dismisses the notification immediately and fallback works without popovers',()=>{
  const {alert,root}=fixture();delete root.showPopover;delete root.hidePopover;
  alert.show({type:'PUBLIC_TELL',actor:'opponent',move:'scissors',at:0},0);
  assert.equal(root.hidden,false);alert.update(10,false);assert.equal(root.hidden,true);assert.equal(alert.until,0);
});
