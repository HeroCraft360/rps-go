import test from 'node:test';
import assert from 'node:assert/strict';
import { BluffAlert } from '../src/ui/bluff-alert.js';
import { Match } from '../src/core/match.js';
import { CONFIG } from '../src/config.js';

const context=(phase='CHOOSING',round=1,reduced=false)=>({phase,round,reduced});
const tell=(overrides={})=>({id:1,type:'PUBLIC_TELL',actor:'opponent',move:'paper',at:100,round:1,...overrides});
function fixture() {
  const root={hidden:true,innerHTML:'',dataset:{},querySelector:()=>({})};
  const announce={textContent:''},sounds=[],painted=[];
  const alert=new BluffAlert(root,announce,{play:value=>sounds.push(value)},(_,move,skin)=>painted.push([move,skin]));
  return {alert,root,announce,sounds,painted};
}
test('public claim stays fully readable for 5500ms, then exits for 220ms',()=>{
  const {alert,root,announce,sounds,painted}=fixture();
  assert.equal(CONFIG.timing.bluffAlert,5500);
  alert.show({...tell(),get lockedMove(){throw Error('private');},get isLie(){throw Error('private');}},100,context());
  assert.equal(root.hidden,false);assert.equal(root.dataset.state,'full');
  for(const text of ['INCOMING SIKE OUT!','BYTE CLAIMS:','<strong>PAPER</strong>',"It's a lieeeeee..."])assert.ok(root.innerHTML.includes(text));
  assert.match(root.innerHTML,/width="100" height="100"/);
  assert.match(announce.textContent,/publicly claims paper/);assert.deepEqual(sounds,['bluff']);assert.deepEqual(painted,[['paper','byte']]);
  alert.update(5599,context());assert.equal(alert.state,'full');
  alert.update(5600,context());assert.equal(alert.state,'exiting');assert.equal(root.hidden,false);
  alert.update(5819,context());assert.equal(root.hidden,false);
  alert.update(5820,context());assert.equal(root.hidden,true);assert.equal(root.innerHTML,'');
});
test('early ready compacts without replaying sound and persists beyond duration until reveal',()=>{
  const {alert,root,sounds}=fixture();alert.show(tell(),100,context());
  for(const [phase,now] of [['LOCKED',500],['BOTH_READY',1000],['HAND_SHAKE',1400],['SHOOT_OVERLAY',7000]]) {
    alert.update(now,context(phase));assert.equal(alert.state,phase==='LOCKED'?'full':'compact');assert.equal(root.hidden,false);
  }
  assert.deepEqual(sounds,['bluff']);
  alert.update(7100,context('REVEAL'));assert.equal(alert.state,'exiting');assert.equal(root.dataset.exitFrom,'compact');
  alert.update(7320,context('REVEAL'));assert.equal(root.hidden,true);
});
test('deadline and same-frame public tell plus readiness render compact immediately',()=>{
  for(const phase of ['BOTH_READY','HAND_SHAKE','SHOOT_OVERLAY']) {
    const {alert,root}=fixture();alert.show(tell(),100,context(phase));
    assert.equal(root.hidden,false);assert.equal(alert.state,'compact');
  }
});
test('stale, future, local, malformed and wrong-round events cannot launch an alert',()=>{
  const {alert,root,sounds}=fixture();
  for(const event of [tell({type:'READY'}),tell({actor:'player'}),tell({at:NaN}),tell({at:101}),tell({at:100-5500}),tell({round:2}),tell({move:'<img onerror=x>'})])alert.show(event,100,context());
  for(const phase of ['REVEAL','ROUND_RESULT','PRE_ROUND','STOPPED',undefined])alert.show(tell(),100,{phase,round:1});
  assert.equal(root.hidden,true);assert.deepEqual(sounds,[]);
});
test('duplicate event does not restart duration, sound or a finished alert',()=>{
  const {alert,sounds}=fixture();alert.show(tell(),100,context());alert.show(tell(),1000,context());
  assert.equal(alert.until,5600);assert.equal(sounds.length,1);
  alert.update(5600,context('CHOOSING',1,true));alert.show(tell(),5601,context());assert.equal(alert.state,'hidden');
});
test('reduced motion keeps full duration and compact claim but removes exit delay',()=>{
  const {alert,root}=fixture();alert.show(tell(),100,context('CHOOSING',1,true));
  alert.update(5599,context('LOCKED',1,true));assert.equal(alert.state,'full');
  alert.update(5600,context('LOCKED',1,true));assert.equal(root.hidden,true);
  alert.show(tell({id:2,at:6000}),6000,context('BOTH_READY',1,true));assert.equal(alert.state,'compact');
  alert.update(6100,context('REVEAL',1,true));assert.equal(root.hidden,true);
});
test('navigation, next round and match completion clear synchronously; old exit cannot hide a new round',()=>{
  for(const phase of ['STOPPED','PRE_ROUND','MATCH_RESULT',undefined]) {
    const {alert,root}=fixture();alert.show(tell(),100,context());alert.update(200,{phase,round:1});assert.equal(root.hidden,true);
  }
  const {alert,root,sounds}=fixture();alert.show(tell(),100,context());alert.update(5600,context());
  alert.show(tell({id:2,round:2,at:5700,move:'rock'}),5700,context('CHOOSING',2));
  alert.update(6000,context('CHOOSING',2));assert.equal(alert.state,'full');assert.match(root.innerHTML,/<strong>ROCK/);assert.equal(sounds.length,2);
  alert.clear();alert.show(tell(),100,context());assert.equal(alert.state,'full');
});
test('real match public-event flow keeps first-to-3 timing and secret locks independent of alert',()=>{
  const {alert,root}=fixture();let now=0;
  const match=new Match({clock:()=>now,rng:()=>.5,bot:{planRound:()=>({tell:'paper',tellAfterMs:1000,readyAfterMs:2000}),choose:()=> 'rock'}});
  const pump=()=>{match.update();const c=context(match.phase,match.round);alert.update(now,c);for(const e of match.drainEvents())alert.show(e,now,c);};
  match.start();now=650;pump();assert.equal(match.remaining,20);
  now=1650;pump();assert.equal(alert.state,'full');assert.equal(match.final,null);
  match.select('scissors');match.confirm();now=2650;pump();assert.equal(match.phase,'BOTH_READY');assert.equal(alert.state,'compact');assert.equal(match.final,null);
  now+=400;pump();assert.equal(match.phase,'HAND_SHAKE');
  now+=1350;pump();assert.equal(match.phase,'SHOOT_OVERLAY');assert.equal(alert.state,'compact');
  now+=700;pump();assert.equal(match.phase,'REVEAL');assert.deepEqual(match.final,{player:'scissors',opponent:'rock'});assert.equal(alert.state,'exiting');
  assert.equal(match.botPerk.charges,1);assert.equal(match.playerPerk.charges,2);
  now+=1200;pump();assert.equal(root.hidden,true);now+=1200;pump();assert.equal(match.round,2);assert.equal(match.phase,'PRE_ROUND');
  now+=650;pump();now+=1000;pump();assert.equal(alert.state,'full');assert.equal(match.botPerk.charges,0);
});
