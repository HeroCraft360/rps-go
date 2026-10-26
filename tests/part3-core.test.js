import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../src/core/match.js';
import { CONFIG } from '../src/config.js';
import { rewardMatch } from '../src/core/economy.js';
import { defaultSave } from '../src/core/storage.js';

function game(ready=9000, roll=.5) {
  let now=0; const inputs=[];
  const m=new Match({clock:()=>now,rng:()=>roll,bot:{planRound:()=>({readyAfterMs:ready,tell:'rock',tellAfterMs:500}),choose:s=>{inputs.push(s);return 'paper';}}});
  const step=ms=>{now+=ms;m.update();};m.start();step(650);
  return {m,inputs,step,set:ms=>{now=650+ms;},reveal:()=>{if(m.phase==='BOTH_READY')step(400);step(1350);step(700);}};
}
test('scheduled BYTE lock refunds pending selector atomically before late submit/cancel',()=>{
  const h=game();h.m.select('rock');h.m.openBluff();const deadline=h.m.deadline;h.set(9000);
  assert.equal(h.m.bluff('scissors'),false);assert.equal(h.m.cancelBluff(),false);assert.equal(h.m.openBluff(),false);
  assert.equal(h.m.playerPerk.charges,2);assert.equal(h.m.playerPerk.spent,0);assert.equal(h.m.playerPerk.pending,false);
  assert.equal(h.m.selected,'rock');assert.equal(h.m.deadline,deadline);assert.equal(h.m.final,null);
  for(let i=0;i<10;i++)h.m.update();const events=h.m.drainEvents();
  assert.equal(events.filter(e=>e.type==='PERK_REFUNDED').length,1);
  assert.equal(events.filter(e=>e.actor==='player'&&e.type==='PUBLIC_TELL').length,0);
  assert.equal(h.inputs[0].publicFakeTell,null);
});
test('last millisecond pre-lock claim is valid; equal-time claim is refunded/rejected',()=>{
  for(const [time,ok] of [[8999,true],[9000,false],[9001,false]]){
    const h=game();h.m.openBluff();h.set(time);assert.equal(h.m.bluff('scissors'),ok);h.step(2);
    assert.equal(h.m.playerPerk.spent,ok?1:0);assert.equal(h.inputs[0].publicFakeTell,ok?'scissors':null);
    assert.equal(h.m.final,null);
  }
});
test('large jumps refund only locks strictly before deadline; exact deadline auto-pick spends once',()=>{
  for(const ready of [19999,20000,20001,Infinity]){
    const h=game(ready);h.m.openBluff();h.set(120000);h.m.update();h.m.cancelBluff();h.m.bluff('paper');h.m.update();
    const refunded=ready<20000;assert.equal(h.m.playerPerk.spent,refunded?0:1);assert.equal(h.m.playerPerk.charges,refunded?2:1);
    const events=h.m.drainEvents();assert.equal(events.filter(e=>e.type==='PERK_REFUNDED').length,refunded?1:0);
    assert.equal(events.filter(e=>e.type==='PERK_EXPIRED').length,refunded?0:1);assert.equal(h.m.final,null);
  }
});
test('accelerated bot target is bounded, keeps earlier plan and clamps to original deadline',()=>{
  for(const [ready,roll,lockAt,expected] of [[15000,0,3000,4000],[15000,1,3000,6000],[3500,.9,3000,3500],[Infinity,.5,19500,20000]]){
    const h=game(ready,roll);h.step(lockAt);h.m.select('rock');h.m.confirm();const d=h.m.deadline;
    h.step(expected-lockAt-1);assert.equal(h.m.botReady,false);h.step(1);assert.equal(h.m.botReady,true);
    assert.equal(h.m.deadline,d);assert.equal(h.m.confirm(),false);assert.equal(h.m.select('paper'),false);
    assert.equal(h.m.final,null);h.reveal();assert.equal(h.m.final.player,'rock');
  }
});
test('refunds never contribute loss penalty and stop clears pending reservations',()=>{
  const h=game();h.m.openBluff();h.step(9000);h.m.phase='MATCH_RESULT';h.m.scores.opponent=3;
  const save=defaultSave();save.coins=100;assert.equal(rewardMatch(save,h.m),0);assert.equal(save.coins,100);
  const k=game();k.m.openBluff();k.m.stop();assert.equal(k.m.playerPerk.charges,2);assert.equal(k.m.playerPerk.spent,0);assert.deepEqual(k.m.drainEvents(),[]);
});
test('visible records publish only at reveal, include claims/autopicks, cap and reset independently of bot history',()=>{
  const h=game();
  for(let round=1;round<=9;round++){
    h.m.openBluff();h.m.bluff('scissors');h.m.select('paper');h.step(20000);
    assert.equal(h.m.recentRounds.length,Math.min(round-1,CONFIG.recentRounds));h.reveal();h.m.update();
    const record=h.m.recentRounds.at(-1);assert.equal(record.round,round);assert.equal(record.player,'paper');assert.equal(record.opponent,'paper');assert.equal(record.result,'tie');assert.equal(record.opponentClaim,round<=2?'rock':null);
    assert.ok(Object.isFrozen(record));assert.equal(h.m.recentRounds.length,Math.min(round,6));
    h.step(1200);h.step(1200);h.step(650);
  }
  assert.deepEqual(h.m.history,Array(5).fill('paper'));assert.deepEqual(new Match().recentRounds,[]);
  const idle=game(Infinity);idle.step(20000);idle.reveal();assert.equal(idle.m.recentRounds[0].playerAutoPick,true);assert.equal(idle.m.recentRounds[0].opponentAutoPick,true);
});
