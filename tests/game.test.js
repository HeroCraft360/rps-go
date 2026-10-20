import test from 'node:test';
import assert from 'node:assert/strict';
import { outcome } from '../src/core/rules.js';
import { Match } from '../src/core/match.js';
import { chooseMove, BotController } from '../src/core/bot.js';
import { CONFIG, MOVES } from '../src/config.js';
import { rewardMatch, purchase, equip } from '../src/core/economy.js';
import { defaultSave, validateSave, loadSave, persistSave, SAVE_KEY, LEGACY_SAVE_KEY } from '../src/core/storage.js';
import { newPerk, reserve, cancelReservation, expireReservation, submitTell } from '../src/core/perks.js';

function harness({ opponent = 'scissors', rng = () => .1, readyMs = 9000, tell = null, tellMs = 2000 } = {}) {
  let now = 0;
  const inputs = [], plans = [];
  const bot = { planRound: state => { plans.push(state); return { readyAfterMs: readyMs, tell, tellAfterMs: tellMs }; }, choose: state => { inputs.push(state); return opponent; } };
  const m = new Match({ clock: () => now, rng, bot });
  const advance = ms => { now += ms; m.update(); };
  const ready = () => { if (m.phase === 'IDLE') m.start(); advance(CONFIG.timing.intro); };
  const reveal = () => { if (m.phase === 'BOTH_READY') advance(CONFIG.timing.bothReady); advance(CONFIG.timing.shake); advance(CONFIG.timing.shoot); };
  const finish = () => { reveal(); advance(CONFIG.timing.reveal); advance(CONFIG.timing.result); };
  const round = move => { ready(); if (move) m.select(move); advance(CONFIG.roundMs); finish(); };
  return { m, advance, ready, reveal, finish, round, inputs, plans };
}
const memoryStorage = () => {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('all nine outcome combinations and invalid move guard remain correct', () => {
  const expected = { rock: {rock:'tie',scissors:'player',paper:'opponent'}, scissors: {rock:'opponent',scissors:'tie',paper:'player'}, paper: {rock:'player',scissors:'opponent',paper:'tie'} };
  for (const p of MOVES) for (const b of MOVES) assert.equal(outcome(p,b),expected[p][b]);
  assert.throws(() => outcome('invalid','rock'));
});
test('ties extend beyond five rounds and end at exactly three decisive wins', () => {
  const h = harness(); for (let i=0;i<7;i++) h.round('scissors');
  assert.deepEqual(h.m.scores,{player:0,opponent:0}); assert.equal(h.m.round,8);
  h.round('rock');h.round('rock');assert.notEqual(h.m.phase,'MATCH_RESULT');
  h.round('rock');assert.equal(h.m.phase,'MATCH_RESULT');h.advance(999999);assert.equal(h.m.scores.player,3);
});
test('a tie at 2-2 does not end the match', () => {
  const h=harness();for(const move of ['rock','paper','rock','paper','scissors'])h.round(move);
  assert.deepEqual(h.m.scores,{player:2,opponent:2});assert.equal(h.m.phase,'PRE_ROUND');h.round('paper');assert.equal(h.m.phase,'MATCH_RESULT');
});
test('player ready at 4s and BYTE at 9s progresses at 9s with private immutable locks', () => {
  const h=harness();h.ready();assert.equal(h.m.confirm(),false);h.advance(4000);h.m.select('rock');assert.equal(h.m.confirm(),true);
  assert.equal(h.m.confirm(),false);assert.equal(h.m.select('paper'),false);assert.equal(h.m.openBluff(),false);
  assert.equal(h.m.phase,'LOCKED');h.advance(4999);assert.equal(h.m.botReady,false);assert.equal(h.m.final,null);
  h.advance(1);assert.equal(h.m.phase,'BOTH_READY');assert.equal(h.m.final,null);assert.equal(h.m.scores.player,0);
  h.reveal();assert.deepEqual(h.m.final,{player:'rock',opponent:'scissors'});assert.ok(Object.isFrozen(h.m.final));assert.equal(h.m.scores.player,1);
  for(let i=0;i<10;i++)h.m.update();assert.equal(h.m.scores.player,1);assert.equal(h.inputs.length,1);
});
test('BYTE ready at 5s leaves human choosing until human locks at 13s', () => {
  const h=harness({readyMs:5000});h.ready();h.advance(5000);
  assert.equal(h.m.botReady,true);assert.equal(h.m.canChoose,true);assert.equal(h.m.canPerk,true);assert.equal(h.m.final,null);
  h.advance(8000);h.m.select('paper');h.m.confirm();assert.equal(h.m.phase,'BOTH_READY');assert.equal(h.inputs.length,1);
});
test('shared countdown is 20 seconds; highlighted move settles at zero', () => {
  const h=harness();h.ready();assert.equal(h.m.remaining,20);h.advance(1500);assert.equal(h.m.remaining,19);
  h.m.select('paper');h.advance(18499);assert.equal(h.m.phase,'CHOOSING');assert.equal(h.m.remaining,1);
  h.advance(1);assert.equal(h.m.phase,'HAND_SHAKE');assert.equal(h.m.autoPick,false);assert.equal(h.m.final,null);
  h.reveal();assert.equal(h.m.final.player,'paper');
});
test('both idle sides auto-pick at deadline; bot never-ready controller cannot stall', () => {
  const h=harness({readyMs:Infinity});h.ready();h.advance(20000);
  assert.equal(h.m.autoPick,true);assert.equal(h.m.botAutoPick,true);assert.equal(h.inputs.length,0);
  h.reveal();assert.deepEqual(h.m.final,{player:'rock',opponent:'rock'});
});
test('player locked at 3s retains their move when BYTE times out', () => {
  const h=harness({readyMs:Infinity});h.ready();h.advance(3000);h.m.select('paper');h.m.confirm();h.advance(17000);
  assert.equal(h.m.autoPick,false);assert.equal(h.m.botAutoPick,true);h.reveal();assert.equal(h.m.final.player,'paper');
});
test('near-deadline selections, confirms, and repeated updates cannot race resolution', () => {
  const h=harness();h.ready();h.advance(19999);h.m.select('rock');h.advance(1);
  assert.equal(h.m.select('paper'),false);assert.equal(h.m.confirm(),false);
  for(let i=0;i<10;i++)h.m.update();assert.equal(h.inputs.length,1);h.reveal();assert.equal(h.m.final.player,'rock');
});
test('background resume observes original deadline, preserves beats, and scores once', () => {
  const h=harness();h.m.start();h.advance(120000);assert.equal(h.m.phase,'HAND_SHAKE');assert.equal(h.m.remaining,0);assert.equal(h.inputs.length,1);
  h.reveal();assert.equal(h.m.scores.player,1);h.m.update();assert.equal(h.m.scores.player,1);
});
test('public lock and tell events never contain hidden moves', () => {
  const h=harness();h.ready();h.m.select('paper');h.m.confirm();h.advance(9000);
  assert.deepEqual(h.m.drainEvents().map(e=>Object.keys(e).sort()),[['actor','at','id','round','type'],['actor','at','id','round','type']]);
  assert.equal(h.m.final,null);assert.equal(h.m.drainEvents().length,0);
});
test('Sike Out reserves one, cancels for free, and submits independently of real choice', () => {
  const h=harness();h.ready();h.m.select('rock');assert.equal(h.m.openBluff(),true);
  assert.equal(h.m.playerPerk.charges,1);assert.equal(h.m.playerPerk.spent,0);assert.equal(h.m.confirm(),false);assert.equal(h.m.select('paper'),false);
  assert.equal(h.m.cancelBluff(),true);assert.equal(h.m.playerPerk.charges,2);
  h.m.openBluff();assert.equal(h.m.bluff('paper'),true);assert.equal(h.m.selected,'rock');assert.equal(h.m.playerPerk.spent,1);
  assert.equal(h.m.openBluff(),false);assert.equal(h.m.bluff('scissors'),false);
  h.advance(20000);h.finish();h.ready();h.m.openBluff();h.m.bluff('rock');assert.equal(h.m.playerPerk.charges,0);
  h.advance(20000);h.finish();h.ready();assert.equal(h.m.openBluff(),false);
});
test('unsubmitted selector expires once, burns charge, emits no public tell', () => {
  const h=harness();h.ready();h.advance(19000);h.m.openBluff();h.advance(1000);
  assert.equal(h.m.bluffOpen,false);assert.equal(h.m.playerPerk.charges,1);assert.equal(h.m.playerPerk.spent,1);assert.equal(h.m.playerPerk.tell,null);
  assert.equal(h.m.cancelBluff(),false);assert.equal(h.m.bluff('paper'),false);h.m.update();assert.equal(h.m.playerPerk.spent,1);
  const events=h.m.drainEvents();assert.equal(events.filter(e=>e.type==='PERK_EXPIRED').length,1);assert.equal(events.filter(e=>e.type==='PUBLIC_TELL').length,0);
});
test('cancel just before deadline refunds; cancel delivered at deadline burns', () => {
  const h=harness();h.ready();h.m.openBluff();h.advance(19999);h.m.cancelBluff();assert.equal(h.m.playerPerk.charges,2);
  h.m.openBluff();h.advance(1);h.m.cancelBluff();assert.equal(h.m.playerPerk.charges,1);assert.equal(h.m.playerPerk.spent,1);
});
test('perk invalid submissions and repeated reserves cannot spend twice', () => {
  const p=newPerk();assert.equal(submitTell(p,'invalid'),false);reserve(p);assert.equal(reserve(p),false);assert.equal(submitTell(p,'invalid'),false);
  assert.equal(cancelReservation(p),true);assert.equal(expireReservation(p),false);assert.equal(p.charges,2);
  reserve(p);expireReservation(p);assert.equal(expireReservation(p),false);assert.equal(submitTell(p,'rock'),false);assert.equal(p.spent,1);
});
test('BYTE receives only frozen public fields, prior reveals, and public planning metadata', () => {
  const h=harness();h.round('paper');h.ready();h.m.select('rock');h.advance(9000);
  assert.deepEqual(Object.keys(h.inputs[1]).sort(),['previousRevealedPlayerMoves','publicFakeTell','roundNumber'].sort());assert.deepEqual(h.inputs[1].previousRevealedPlayerMoves,['paper']);
  assert.ok(Object.isFrozen(h.inputs[1]));assert.ok(Object.isFrozen(h.inputs[1].previousRevealedPlayerMoves));assert.deepEqual(Object.keys(h.plans[0]).sort(),['charges','roundNumber']);
});
test('public tell before BYTE lock influences chooser; tell afterward never changes locked move', () => {
  const h=harness();h.ready();h.m.openBluff();h.m.bluff('paper');h.advance(9000);assert.equal(h.inputs[0].publicFakeTell,'paper');
  const k=harness();k.ready();k.advance(9000);k.m.openBluff();k.m.bluff('paper');k.m.select('rock');k.m.confirm();k.reveal();
  assert.equal(k.inputs[0].publicFakeTell,null);assert.equal(k.inputs.length,1);assert.equal(k.m.final.opponent,'scissors');
});
test('overdue BYTE lock is processed before a newly delivered public claim', () => {
  const h=harness();h.ready();h.m.openBluff();h.advance(9001);h.m.bluff('paper');assert.equal(h.inputs[0].publicFakeTell,null);
});
test('bot strategy ignores hidden fields and reacts only to public claims', () => {
  const publicState={previousRevealedPlayerMoves:['rock'],publicFakeTell:'scissors',roundNumber:2};
  for(const name of ['playerSelectedMove','playerLockedMove','playerActualMove'])Object.defineProperty(publicState,name,{get:()=>{throw Error('Secret accessed');}});
  assert.equal(chooseMove(publicState,()=>.1),'rock');assert.equal(chooseMove({...publicState,publicFakeTell:'rock'},()=>.1),'paper');assert.equal(chooseMove(publicState,()=>.6),'paper');
});
test('BYTE scheduling is bounded, variable and provides readable tell lead time', () => {
  const times=new Set();for(const r of [.01,.3,.6,.99]){const p=new BotController(()=>r).planRound({roundNumber:2,charges:2});times.add(p.readyAfterMs);assert.ok(p.readyAfterMs>=4000&&p.readyAfterMs<=15000);if(p.tell)assert.ok(p.readyAfterMs-p.tellAfterMs>=2400);}
  assert.equal(times.size,4);assert.equal(new BotController(()=>.1).planRound({roundNumber:1,charges:2}).tell,null);
});
test('BYTE claims use independent charges, one per round, and publish without revealing truth', () => {
  const h=harness({tell:'scissors'});h.ready();h.advance(2000);assert.equal(h.m.botPerk.charges,1);assert.equal(h.m.playerPerk.charges,2);
  const event=h.m.drainEvents().find(e=>e.type==='PUBLIC_TELL');assert.equal(event.move,'scissors');assert.equal('truthful' in event,false);
  h.advance(18000);h.finish();h.round('rock');assert.equal(h.m.botPerk.charges,0);h.ready();h.advance(2000);assert.equal(h.m.botPerk.tell,null);
});
for(const used of [0,1,2])test(`completed defeat with ${used} consumed charges settles ${-used*25} exactly once`,()=>{
  const save=defaultSave();save.coins=100;const h=harness();
  for(let i=0;i<3;i++){h.ready();h.m.select('paper');if(i<used){h.m.openBluff();h.m.bluff('rock');}h.advance(20000);h.finish();}
  assert.equal(rewardMatch(save,h.m),-used*25||0);assert.equal(save.coins,100-used*25);assert.equal(rewardMatch(save,h.m),0);
});
test('expired attempts count toward loss; actual deduction clamps to wallet',()=>{
  const h=harness();for(let i=0;i<3;i++){h.ready();h.m.select('paper');if(i<2)h.m.openBluff();h.advance(20000);h.finish();}
  const save=defaultSave();save.coins=10;assert.equal(h.m.playerPerk.spent,2);assert.equal(rewardMatch(save,h.m),-10);assert.equal(save.coins,0);assert.equal(h.m.requestedReward,-50);
});
test('victory stays +120 even after two bluffs; fully automatic victories earn zero',()=>{
  const save=defaultSave(),h=harness();for(let i=0;i<3;i++){h.ready();h.m.select('rock');if(i<2){h.m.openBluff();h.m.bluff('paper');}h.advance(20000);h.finish();}
  assert.equal(rewardMatch(save,h.m),120);assert.equal(rewardMatch(save,h.m),0);
  const idle=harness();for(let i=0;i<3;i++)idle.round();assert.equal(rewardMatch(save,idle.m),0);
});
test('abandonment and BYTE charges never deduct coins; canceled reservations are free',()=>{
  const save=defaultSave();save.coins=100;const h=harness({tell:'paper'});h.ready();h.m.openBluff();h.m.bluff('rock');h.m.stop();assert.equal(rewardMatch(save,h.m),0);assert.equal(save.coins,100);
  const k=harness({tell:'rock'});for(let i=0;i<3;i++){k.ready();k.m.select('paper');k.m.openBluff();k.m.cancelBluff();k.advance(20000);k.finish();}assert.equal(rewardMatch(save,k.m),0);assert.equal(save.coins,100);
});
test('skin and map purchases share balance, block duplicates, and require ownership to equip',()=>{
  const save=defaultSave();assert.equal(purchase(save,'neon-circuit').ok,false);assert.equal(equip(save,'solar-flare'),false);assert.equal(equip(save,'circuit-sanctuary','map'),false);
  save.coins=1000;assert.equal(purchase(save,'neon-circuit').ok,true);assert.equal(purchase(save,'circuit-sanctuary','map').ok,true);assert.equal(save.coins,0);
  assert.equal(purchase(save,'circuit-sanctuary','map').ok,false);assert.equal(purchase(save,'starlight-hangar','map').ok,false);assert.equal(equip(save,'circuit-sanctuary','map'),true);assert.equal(equip(save,'neon-circuit'),true);assert.equal(purchase(save,'bogus').ok,false);
});
test('legacy v1 migration preserves every existing progress field and retains the untouched backup',()=>{
  const storage=memoryStorage();const old={version:1,coins:179960,ownedSkinIds:['classic','neon-circuit','solar-flare'],equippedSkinId:'solar-flare',tutorialSeen:true,settings:{sound:false,reducedMotion:true}};
  const raw=JSON.stringify(old);storage.setItem(LEGACY_SAVE_KEY,raw);const save=loadSave(storage);
  assert.equal(save.version,2);for(const key of ['coins','ownedSkinIds','equippedSkinId','tutorialSeen','settings'])assert.deepEqual(save[key],old[key]);
  assert.deepEqual(save.ownedMapIds,['neon-launchpad']);assert.equal(save.equippedMapId,'neon-launchpad');assert.equal(storage.getItem(LEGACY_SAVE_KEY),raw);assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).coins,old.coins);
});
test('migration tolerates failed writes without deleting legacy progress',()=>{
  const raw=JSON.stringify({...defaultSave(),version:1,coins:765});const storage={getItem:key=>key===LEGACY_SAVE_KEY?raw:null,setItem:()=>{throw Error('blocked');}};
  assert.equal(loadSave(storage).coins,765);assert.equal(storage.getItem(LEGACY_SAVE_KEY),raw);
});
test('v2 wins over stale v1; malformed v2 falls back to legacy',()=>{
  const s=memoryStorage();s.setItem(LEGACY_SAVE_KEY,JSON.stringify({...defaultSave(),version:1,coins:500}));s.setItem(SAVE_KEY,JSON.stringify({...defaultSave(),coins:100}));assert.equal(loadSave(s).coins,100);
  s.setItem(SAVE_KEY,'broken');assert.equal(loadSave(s).coins,500);
});
test('map equipment and settings persist across reload; malformed data defaults safely',()=>{
  const storage=memoryStorage(),save=defaultSave();save.coins=1400;purchase(save,'starlight-hangar','map');equip(save,'starlight-hangar','map');save.tutorialSeen=true;
  assert.equal(persistSave(storage,save),true);assert.deepEqual(loadSave(storage),save);assert.equal(persistSave(null,save),false);assert.deepEqual(loadSave(null),defaultSave());
  assert.deepEqual(validateSave({version:0,coins:500}),defaultSave());const bad=validateSave({version:2,coins:-2,ownedSkinIds:['bad'],equippedSkinId:'solar-flare',ownedMapIds:['bad'],equippedMapId:'starlight-hangar'});
  assert.equal(bad.coins,0);assert.equal(bad.equippedSkinId,'classic');assert.equal(bad.equippedMapId,'neon-launchpad');
});
test('replay resets readiness, histories and charges while preserving inventory',()=>{
  const h=harness();h.round('rock');const save=defaultSave();save.coins=300;purchase(save,'neon-circuit');equip(save,'neon-circuit');const replay=new Match();
  assert.deepEqual(replay.scores,{player:0,opponent:0});assert.deepEqual(replay.history,[]);assert.equal(replay.playerPerk.charges,2);assert.equal(replay.botPerk.charges,2);assert.equal(replay.playerReady,false);assert.equal(replay.botReady,false);assert.equal(save.equippedSkinId,'neon-circuit');assert.equal(replay.awarded,false);
});
