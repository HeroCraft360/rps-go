# RPS GO! — Minimal private multiplayer prototype

This is a **separate local-network proof of concept**, not a production multiplayer rollout. It does not change BYTE mode or the live GitHub Pages game. Zero new npm dependencies.

## Run

From the repository root, using Node.js 20 or newer:

```bash
node multiplayer/server.mjs
```

Open **http://localhost:8787** in one browser and select **CREATE ROOM**. Open the same address in another browser tab and **JOIN ROOM** with the displayed code. On a phone on the same Wi-Fi, use `http://YOUR_COMPUTER_LAN_IP:8787` (make sure your OS firewall allows the local connection). The invite link uses the address in the host browser, so when sharing to a phone, use the LAN address rather than `localhost`.

Each player chooses a secret hand; the server sends only readiness until both players lock or the 20-second deadline expires. Results are first-to-3, ties replay, and both players can request a rematch. Reloading a tab recovers its seat from `sessionStorage` while the server is running.

## Test

```bash
node --test multiplayer/room.test.mjs
```

## Intentionally postponed

- No publicly hosted backend yet. The two browsers must reach this running Node server.
- No integration with the main game UI yet; this is an isolated test page.
- No Sike Out!, skins, voice, GO Coins, matchmaking, accounts, anti-cheat enforcement beyond basic authoritative move handling, or mobile-push handling.
- Rooms reside in memory, expire after two hours of inactivity, and are lost if the server stops. A production release will need persistent state, real deployment, abuse limits and stronger reconnect behavior.
- This local prototype uses plain HTTP. Do not expose it directly to the public Internet or put it behind a public port-forward without adding HTTPS and appropriate protections.

If the two-browser experience feels right, port the room logic to a persistent managed service (such as Cloudflare Durable Objects), connect it to the normal game's Multiplayer button, and separately integrate Sike Out! while preserving its original rules.
