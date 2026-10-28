import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Room, makeCode } from './room.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const rooms = new Map();
const streams = new Set();
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';

async function jsonBody(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString();
    if (text.length > 4096) throw new Error('REQUEST_TOO_LARGE');
  }
  try { return JSON.parse(text || '{}'); } catch { throw new Error('INVALID_JSON'); }
}
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function getRoom(code) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) throw new Error('ROOM_NOT_FOUND');
  return room;
}
function publish(room) {
  for (const sub of streams) if (sub.room === room) {
    try {
      const state = JSON.stringify(room.view(sub.token));
      if (sub.last !== state) { sub.res.write(`data: ${state}\n\n`); sub.last = state; }
    } catch { streams.delete(sub); sub.res.end(); }
  }
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/multiplayer')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(await readFile(join(dir, 'index.html'))); return;
    }
    if (req.method === 'GET' && url.pathname === '/health') { send(res, 200, { ok: true, rooms: rooms.size }); return; }
    if (req.method === 'POST' && url.pathname === '/api/create') {
      let code; do { code = makeCode(); } while (rooms.has(code));
      const room = new Room(code); rooms.set(code, room);
      send(res, 200, room.join()); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/join') {
      const data = await jsonBody(req); const room = getRoom(data.room);
      const seat = room.join(); send(res, 200, seat); publish(room); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/choose') {
      const data = await jsonBody(req); const room = getRoom(data.room);
      room.choose(data.token, data.hand); send(res, 200, { ok: true }); publish(room); return;
    }
    if (req.method === 'POST' && url.pathname === '/api/rematch') {
      const data = await jsonBody(req); const room = getRoom(data.room);
      room.rematch(data.token); send(res, 200, { ok: true }); publish(room); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/state') {
      const room = getRoom(url.searchParams.get('room'));
      send(res, 200, room.view(url.searchParams.get('token'))); return;
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      const room = getRoom(url.searchParams.get('room'));
      const token = url.searchParams.get('token'); room.seatFor(token);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 1500\n\n');
      const sub = { room, token, res, last: null }; streams.add(sub);
      publish(room); req.on('close', () => streams.delete(sub)); return;
    }
    send(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    const known = ['ROOM_FULL','ROOM_NOT_FOUND','INVALID_SEAT','ROUND_CLOSED','INVALID_MOVE','ALREADY_LOCKED','NOT_FINISHED','REQUEST_TOO_LARGE','INVALID_JSON'];
    send(res, known.includes(error.message) ? 400 : 500, { error: known.includes(error.message) ? error.message : 'SERVER_ERROR' });
  }
});

const ticker = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > 2 * 60 * 60_000) {
      rooms.delete(code);
      for (const sub of streams) if (sub.room === room) { sub.res.end(); streams.delete(sub); }
    } else {
      if (room.tick(now)) publish(room);
      // Refresh displayed countdown at approximately one-second intervals.
      if (now % 1000 < 300) publish(room);
    }
  }
}, 250);
ticker.unref();
server.listen(port, host, () => console.log(`RPS GO! private multiplayer prototype: http://localhost:${port}`));
