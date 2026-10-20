import test from 'node:test';
import assert from 'node:assert/strict';
import { HomeReturn } from '../src/core/home-return.js';
test('victory auto-return waits for three visible seconds and fires once',()=>{
  let now=0;const r=new HomeReturn(()=>now);r.start('victory');now=2999;assert.equal(r.tick('victory'),false);now=3000;assert.equal(r.tick('victory'),true);assert.equal(r.tick('victory'),false);
});
test('hidden time does not skip celebration; resume continues the remainder',()=>{
  let now=0;const r=new HomeReturn(()=>now);r.start('a');now=1000;r.tick('a');r.setPaused(true);now=100000;assert.equal(r.tick('a'),false);r.setPaused(false);now+=1999;assert.equal(r.tick('a'),false);now++;assert.equal(r.tick('a'),true);
});
test('stay here, explicit home, and a different match invalidate auto-return',()=>{
  let now=0;const r=new HomeReturn(()=>now);r.start('old');now=4000;assert.equal(r.tick('new'),false);r.cancel();assert.equal(r.tick('old'),false);assert.equal(r.id,null);
});
