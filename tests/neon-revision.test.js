import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { HAND_ART, handArtId } from '../src/render/hand-assets.js';
import { defaultSave, loadSave, persistSave, SAVE_KEY } from '../src/core/storage.js';
import { purchase, equip } from '../src/core/economy.js';

// Decode only the non-interlaced, 8-bit RGBA format used by runtime hand PNGs.
// Measuring actual alpha catches stale crop bounds that a PNG-header check misses.
function alphaBounds(png) {
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const chunks = [];
  let width, height;
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + length + 12 <= png.length, 'Complete PNG chunk');
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      assert.deepEqual([width, height], [768, 768]);
      assert.deepEqual([...data.subarray(8)], [8, 6, 0, 0, 0], '8-bit RGBA, standard compression/filter, no interlace');
    }
    if (type === 'IDAT') chunks.push(data);
    offset += length + 12;
    if (type === 'IEND') break;
  }
  assert.ok(width && height && chunks.length, 'PNG includes header and image data');
  const stride = width * 4, raw = inflateSync(Buffer.concat(chunks));
  assert.equal(raw.length, height * (stride + 1));
  let previous = Buffer.alloc(stride), left = width, top = height, right = 0, bottom = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1), filter = raw[start], row = Buffer.alloc(stride);
    assert.ok(filter <= 4, 'Known PNG row filter');
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? row[i - 4] : 0, b = previous[i], c = i >= 4 ? previous[i - 4] : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      row[i] = (raw[start + 1 + i] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const alpha = row[x * 4 + 3];
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) assert.equal(alpha, 0, 'Artwork has a clear transparent border');
      if (alpha) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1); }
    }
    previous = row;
  }
  assert.ok(right > left && bottom > top, 'Sprite contains visible artwork');
  return [left, top, right, bottom];
}

test('revised Neon PNG alpha bounds match the manifest and shared icon crops', async () => {
  const manifest = JSON.parse(await readFile(new URL('../assets/hands/part3/manifest.json', import.meta.url)));
  for (const move of ['rock', 'paper', 'scissors']) {
    const id = handArtId(move, 'neon-circuit'), item = manifest.sprites.find(sprite => sprite.id === id);
    assert.ok(item, `${move} has manifest metadata`);
    const actual = alphaBounds(await readFile(new URL(HAND_ART[id].url)));
    assert.deepEqual(actual, item.bounds, `${id}: manifest describes all nontransparent pixels`);
    assert.deepEqual(actual, HAND_ART[id].bounds, `${id}: icons crop the complete artwork`);
    assert.equal(item.armEntry, 'right');
  }
});

test('Neon revision preserves all nine approved Classic, BYTE, and Solar Flare PNGs', async () => {
  const classicAndByte = JSON.parse(await readFile(new URL('./approved-hand-hashes.json', import.meta.url)));
  // Solar Flare hashes captured before the focused Neon revision; reuse the existing six approved hashes.
  const hashes = { ...classicAndByte,
    'assets/hands/part3/solar_flare_paper.png': '3127c71ea98781c97aa58612c60d79d983b07584cdfd1a0289d25dd0c338b9e1',
    'assets/hands/part3/solar_flare_rock.png': 'c132591c8f07aa40fcd8c3765bde0b838e75a4957626d5d2cfd7edf8df318991',
    'assets/hands/part3/solar_flare_scissors.png': '59892d067b78deaf4ecec98c979e02bcd755fe652eadb80aed9f118b917d17a7',
  };
  assert.equal(Object.keys(hashes).length, 9);
  for (const [path, expected] of Object.entries(hashes)) {
    const actual = createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex');
    assert.equal(actual, expected, path);
  }
});

test('an existing equipped Neon purchase survives reload and does not require another charge', () => {
  const saved = { ...defaultSave(), coins: 742, ownedSkinIds: ['classic', 'neon-circuit', 'solar-flare'], equippedSkinId: 'neon-circuit',
    ownedMapIds: ['neon-launchpad', 'circuit-sanctuary'], equippedMapId: 'circuit-sanctuary', tutorialSeen: true,
    settings: { sound: false, reducedMotion: true, sfxVolume: .35, announcerVolume: .2 } };
  const data = new Map([[SAVE_KEY, JSON.stringify(saved)]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const loaded = loadSave(storage);
  assert.deepEqual(loaded, saved);
  for (const move of ['rock', 'paper', 'scissors']) assert.ok(HAND_ART[handArtId(move, loaded.equippedSkinId)]);
  assert.equal(equip(loaded, 'neon-circuit'), true);
  assert.equal(purchase(loaded, 'neon-circuit').ok, false);
  assert.deepEqual(loaded, saved, 'No balance, inventory, settings, tutorial, or map changes');
  assert.equal(persistSave(storage, loaded), true);
  assert.deepEqual(loadSave(storage), saved);
});
