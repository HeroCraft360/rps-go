import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from './room.mjs';
const setup=(at=1000)=>{const r=new Room('DEMO',at);const a=r.join(at),b=r.join(at);return {r,a,b,at};};
test('private moves are hidden from opponent until reveal',()=>{
 const {r,a,b,at}=setup();r.choose(a.token,'rock',at+10);
 const other=r.view(b.token,at+20);
 assert.equal(other.opponentReady,true);assert.equal(other.reveal,null);
 assert.equal(JSON.stringify(other).includes('rock'),false);
 r.choose(b.token,'scissors',at+30);const done=r.view(b.token,at+31);
 assert.deepEqual(done.reveal.hands,['rock','scissors']);assert.deepEqual(done.scores,[1,0]);
});
test('ties award no point and begin a new round',()=>{
 const {r,a,b,at}=setup();r.choose(a.token,'paper',at+1);r.choose(b.token,'paper',at+2);
 assert.deepEqual(r.scores,[0,0]);r.tick(at+2603);assert.equal(r.round,2);assert.equal(r.phase,'choosing');
});
test('deadline auto picks missing hands and locked moves cannot change',()=>{
 const {r,a,b,at}=setup();r.choose(a.token,'rock',at+1);
 assert.throws(()=>r.choose(a.token,'paper',at+2),/ALREADY_LOCKED/);
 r.tick(at+20001);assert.equal(r.phase,'reveal');assert.equal(r.players[1].auto,true);
 assert.throws(()=>r.choose(b.token,'scissors',at+20001),/ROUND_CLOSED/);
});
test('first to 3 finishes match, rematch requires two votes',()=>{
 const {r,a,b,at}=setup();let clock=at;
 for(let i=0;i<3;i++){
  r.choose(a.token,'rock',clock+1);r.choose(b.token,'scissors',clock+2);clock+=2603;
  r.tick(clock);
 }
 assert.equal(r.phase,'finished');assert.deepEqual(r.scores,[3,0]);
 r.rematch(a.token,clock+1);assert.equal(r.phase,'finished');
 r.rematch(b.token,clock+2);assert.equal(r.phase,'choosing');assert.equal(r.round,1);assert.deepEqual(r.scores,[0,0]);
});
test('unknown seat and third join rejected',()=>{
 const {r}=setup();assert.throws(()=>r.join(),/ROOM_FULL/);assert.throws(()=>r.view('fake'),/INVALID_SEAT/);
});
