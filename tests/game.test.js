import test from 'node:test';
import assert from 'node:assert/strict';
import { outcome } from '../src/core/rules.js';
import { Match } from '../src/core/match.js';
import { chooseMove, BotController } from '../src/core/bot.js';
import { CONFIG, MOVES } from '../src/config.js';
import { rewardMatch, purchase, equip } from '../src/core/economy.js';
import { defaultSave, validateSave, loadSave, persistSave, SAVE_KEY } from '../src/core/storage.js';

function harness({ opponent = 'scissors', rng = () => .1 } = {}) {
  let now = 0;
  const inputs=[];
  const bot={planTell:()=>null,choose:state=>{inputs.push(state);return opponent;}};
  const m=new Match({clock:()=>now,rng,bot});
  const advance=ms=>{now+=ms;m.update();};
  const ready=()=>{if(m.phase==='IDLE')m.start();advance(CONFIG.timing.intro);};
  const finish=()=>{advance(CONFIG.timing.shake);advance(CONFIG.timing.shoot);advance(CONFIG.timing.reveal);advance(CONFIG.timing.result);};
  const round=(move)=>{ready();if(move)m.select(move);advance(CONFIG.roundMs);finish();};
  return {m,advance,ready,finish,round,inputs};
}
test('all nine rule combinations',()=>{
  const expected={rock:{rock:'tie',scissors:'player',paper:'opponent'},scissors:{rock:'opponent',scissors:'tie',paper:'player'},paper:{rock:'player',scissors:'opponent',paper:'tie'}};
  for(const p of MOVES)for(const b of MOVES)assert.equal(outcome(p,b),expected[p][b]);
  assert.throws(()=>outcome('invalid','rock'));
});
test('ties can extend beyond five rounds and match ends at exactly three wins',()=>{
  const h=harness();for(let i=0;i<7;i++)h.round('scissors');
  assert.deepEqual(h.m.scores,{player:0,opponent:0});assert.equal(h.m.round,8);
  h.round('rock');h.round('rock');assert.notEqual(h.m.phase,'MATCH_RESULT');
  h.round('rock');assert.equal(h.m.phase,'MATCH_RESULT');assert.equal(h.m.scores.player,3);
  h.advance(999999);assert.equal(h.m.scores.player,3);
});
test('2-2 tie does not end match; a third decisive win does',()=>{
  const h=harness();for(const move of ['rock','paper','rock','paper','scissors'])h.round(move);
  assert.deepEqual(h.m.scores,{player:2,opponent:2});assert.equal(h.m.phase,'PRE_ROUND');
  h.round('paper');assert.equal(h.m.phase,'MATCH_RESULT');assert.equal(h.m.scores.opponent,3);
});
test('selection locks exactly once, no early bot decision or reveal',()=>{
  const h=harness();h.ready();assert.equal(h.m.confirm(),false);assert.equal(h.m.final,null);
  h.m.select('rock');h.m.select('paper');assert.equal(h.m.confirm(),true);
  assert.equal(h.m.confirm(),false);assert.equal(h.m.select('scissors'),false);
  assert.equal(h.m.openBluff(),false);h.advance(9999);assert.equal(h.m.final,null);assert.equal(h.inputs.length,0);
  h.advance(1);assert.deepEqual(h.m.final,{player:'paper',opponent:'scissors'});assert.equal(h.inputs.length,1);
  assert.equal(h.m.phase,'HAND_SHAKE');assert.equal(h.m.scores.opponent,0);
  h.finish();assert.equal(h.m.scores.opponent,1);
});
test('deadline auto-picks only if needed; zero-time clicks cannot race resolution',()=>{
  const h=harness();h.ready();assert.equal(h.m.remaining,10);h.advance(1500);assert.equal(h.m.remaining,9);
  h.advance(8500);assert.equal(h.m.autoPick,true);assert.equal(h.m.final.player,'rock');
  assert.equal(h.m.select('paper'),false);assert.equal(h.m.confirm(),false);
  for(let i=0;i<10;i++)h.m.update();assert.equal(h.inputs.length,1);
  const k=harness();k.ready();k.m.select('paper');k.advance(10000);assert.equal(k.m.final.player,'paper');assert.equal(k.m.autoPick,false);
});
test('background delay respects original deadline and only resolves once',()=>{
  const h=harness();h.m.start();h.advance(120000);
  assert.equal(h.m.phase,'HAND_SHAKE');assert.equal(h.m.remaining,0);assert.equal(h.inputs.length,1);
  h.finish();assert.equal(h.m.scores.player,1);
});
test('Sike Out cancel is free, submit spends once, true move is independent',()=>{
  const h=harness();h.ready();assert.equal(h.m.playerPerk.charges,2);
  h.m.select('rock');h.m.openBluff();h.m.cancelBluff();assert.equal(h.m.playerPerk.charges,2);
  h.m.openBluff();assert.equal(h.m.bluff('paper'),true);assert.equal(h.m.selected,'rock');assert.equal(h.m.playerPerk.charges,1);
  assert.equal(h.m.openBluff(),false);assert.equal(h.m.bluff('scissors'),false);
  h.advance(10000);assert.equal(h.inputs[0].publicFakeTell,'paper');h.finish();h.ready();
  h.m.openBluff();h.m.bluff('scissors');assert.equal(h.m.playerPerk.charges,0);h.advance(10000);h.finish();h.ready();assert.equal(h.m.openBluff(),false);
});
test('unsubmitted bluff times out without charging and does not pause clock',()=>{
  const h=harness();h.ready();h.advance(8500);h.m.openBluff();h.advance(1500);
  assert.equal(h.m.bluffOpen,false);assert.equal(h.m.playerPerk.charges,2);assert.equal(h.m.bluff('paper'),false);assert.equal(h.m.phase,'HAND_SHAKE');
});
test('bot sees only frozen public inputs and bounded prior reveals',()=>{
  const h=harness();h.round('paper');h.ready();h.m.select('rock');h.m.confirm();h.advance(10000);
  assert.deepEqual(Object.keys(h.inputs[1]).sort(),['previousRevealedPlayerMoves','publicFakeTell','roundNumber'].sort());
  assert.deepEqual(h.inputs[1].previousRevealedPlayerMoves,['paper']);assert.ok(Object.isFrozen(h.inputs[1]));assert.ok(Object.isFrozen(h.inputs[1].previousRevealedPlayerMoves));
});
test('bot strategy never consults secret fields; public tells change strategy',()=>{
  const publicState={previousRevealedPlayerMoves:['rock'],publicFakeTell:'scissors',roundNumber:2};
  for(const name of ['playerSelectedMove','playerLockedMove','playerActualMove'])Object.defineProperty(publicState,name,{get:()=>{throw Error('Secret accessed');}});
  assert.equal(chooseMove(publicState,()=>.1),'rock');assert.equal(chooseMove({...publicState,publicFakeTell:'rock'},()=>.1),'paper');
  assert.equal(chooseMove(publicState,()=>.6),'paper');
  assert.ok(MOVES.includes(chooseMove({previousRevealedPlayerMoves:['paper','paper'],roundNumber:3},()=>.9)));
});
test('bot has independent two charges and only signals later rounds',()=>{
  const bot=new BotController(()=>.1);assert.equal(bot.planTell(1,2),null);assert.equal(bot.planTell(2,0),null);assert.equal(bot.planTell(2,2),'rock');
  let now=0;const m=new Match({clock:()=>now,rng:()=>.1,bot});
  m.start();m.round=2;m.pendingTell=bot.planTell(2,2);now=650;m.update();now+=4000;m.update();
  assert.equal(m.botPerk.tell,'rock');assert.equal(m.botPerk.charges,1);assert.equal(m.playerPerk.charges,2);m.update();assert.equal(m.botPerk.charges,1);
});
test('rewards once for a completed active victory or defeat, never idle or abandoned',()=>{
  const save=defaultSave(),h=harness();assert.equal(rewardMatch(save,h.m),0);
  for(let i=0;i<3;i++)h.round('rock');assert.equal(rewardMatch(save,h.m),120);assert.equal(rewardMatch(save,h.m),0);assert.equal(save.coins,120);
  const loss=harness();for(let i=0;i<3;i++)loss.round('paper');assert.equal(rewardMatch(save,loss.m),50);
  const idle=harness();for(let i=0;i<3;i++)idle.round();assert.equal(rewardMatch(save,idle.m),0);
  const abandoned=harness();abandoned.round('rock');abandoned.m.stop();assert.equal(rewardMatch(save,abandoned.m),0);
});
test('shop guards prices, duplicate purchases, negative balances and ownership',()=>{
  const save=defaultSave();assert.equal(purchase(save,'neon-circuit').ok,false);assert.equal(equip(save,'solar-flare'),false);assert.equal(save.coins,0);
  save.coins=950;assert.equal(purchase(save,'neon-circuit').ok,true);assert.equal(save.coins,650);assert.equal(purchase(save,'neon-circuit').ok,false);
  assert.equal(equip(save,'neon-circuit'),true);assert.equal(purchase(save,'solar-flare').ok,true);assert.equal(save.coins,0);assert.equal(purchase(save,'bogus').ok,false);
});
test('save survives reload and repairs malformed/old payloads; storage can fail safely',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  const save=defaultSave();save.coins=500;purchase(save,'neon-circuit');equip(save,'neon-circuit');save.tutorialSeen=true;
  assert.equal(persistSave(storage,save),true);assert.deepEqual(loadSave(storage),save);
  data.set(SAVE_KEY,'broken json');assert.deepEqual(loadSave(storage),defaultSave());
  assert.deepEqual(validateSave({version:0,coins:500}),defaultSave());
  const repaired=validateSave({version:1,coins:-50,ownedSkinIds:['unknown','classic','classic'],equippedSkinId:'solar-flare'});
  assert.equal(repaired.coins,0);assert.deepEqual(repaired.ownedSkinIds,['classic']);assert.equal(repaired.equippedSkinId,'classic');
  assert.equal(persistSave(null,save),false);assert.deepEqual(loadSave(null),defaultSave());
});
test('replay has fresh score, history and charges while persistence stays intact',()=>{
  const h=harness();h.round('rock');const save=defaultSave();save.coins=300;purchase(save,'neon-circuit');equip(save,'neon-circuit');
  const replay=new Match();assert.deepEqual(replay.scores,{player:0,opponent:0});assert.deepEqual(replay.history,[]);assert.equal(replay.playerPerk.charges,2);assert.equal(replay.botPerk.charges,2);
  assert.equal(save.equippedSkinId,'neon-circuit');assert.equal(replay.awarded,false);assert.notEqual(replay.id,h.m.id);
});
