# Phase 2B review notes

## Scope and baseline

Implemented on `codex/phase-2b-gameplay-evolution` for review before merging. The inspected remote main was `35591de` (Fix result overlay and return from post-match shop). No separate completed Phase 2A branch or additional Phase 2A modules were present. Existing pixel-art hands, ornate perk cards, arena renderer, SHOOT sequence, fonts and synthesized audio were preserved. No references or design documents are published.

## Implemented

- Shared 20-second selection deadline, independent private locks, both readiness orders, animated waiting, 400 ms BOTH READY cue and complete existing reveal sequence. Highlighted selections or random auto-picks resolve at zero.
- BYTE schedules decisions independently in the configured 4–15 second range. Its controller receives only public metadata, prior reveals and claims available before its lock.
- Separate two-charge perk lifecycle for each participant: reserve, cancel/refund, submit/spend and expire/spend without a tell. Expiration cannot be refunded by a late click. Player confirmation is disabled while choosing a bluff.
- Public incoming BYTE claim notification with ghost text, an icon and synthesized sound. Stale notifications are discarded and resolution clears them. Its text cannot access hidden truth or locked moves.
- One-time signed settlement: eligible victory +120; defeat 0, −25 or −50 according to player charges consumed, capped by the wallet. Abandonment does not settle. Expired attempts count; BYTE's usage never charges the player.
- Original home-map scenes: free Neon Launchpad, Circuit Sanctuary at 700 and Starlight Hangar at 1,400. Purchases share the skin wallet; ownership/equipment remain independent.
- Large animated hand showcase with three-pose selection, owned/locked skin carousel, previews, purchase/equip actions and keyboard focus retention. Uses the exact arena sprite renderer.
- Three visible seconds of victory celebration before returning to the equipped home map, immediate RETURN HOME and optional STAY HERE. Defeat offers RETURN HOME and REMATCH. First-time welcome/tutorial remains intact.
- Additive v1-to-v2 save migration retaining the original v1 backup, existing coins, skin ownership/equipment, settings and tutorial progress. Invalid v2 falls back to v1. Explicit save reset remains the only intentional reset flow.

## Major files

| Files | Purpose |
|---|---|
| `src/config.js` | Timer, BYTE scheduling, economy and map defaults |
| `src/core/match.js`, `bot.js`, `perks.js` | Independent locks, public events, bot decisions and charge lifecycle |
| `src/core/economy.js`, `storage.js` | Signed settlement, cosmetic purchases and migration |
| `src/core/home-return.js` (new) | Cancelable visible-time celebration timer |
| `index.html`, `src/main.js` | Hub, gameplay indicators, modal navigation, results and persistence wiring |
| `src/render/home-hub.js` (new) | Three original cached 2D scenes and shared hand showcase |
| `src/ui/bluff-alert.js`, `customization.js` (new), `sound.js` | Public notification, carousel/map controls and alert tone |
| `src/styles/phase2b.css` (new) | Additive neon UI, responsive layouts and motion treatment |
| `tests/game.test.js`, `home-return.test.js`, `bluff-alert.test.js` | Deterministic regression and new-system coverage |
| `README.md`, this document | Rules, preview/deployment and review notes |

## Verification

Baseline: 15 existing tests passed before changes. Final automated suite: **39 passed, 0 failed**, using `node --test`. Updated old expectations where the approved timer/economy rules changed; retained outcome, tie, first-to-three and replay regression coverage. Additional tests cover readiness in both orders, deadline races, background reconciliation, private-state boundaries, pre/post-lock claims, reservation expiry, once-only/capped deductions, shared-wallet purchase guards, save backups, failed writes and home-return cancellation. Notification tests exercise real presentation logic with a minimal DOM adapter and injected icon painter.

`node --check src/main.js`, `node scripts/build.mjs` and `git diff --check` passed. The production package was browser-tested under `/dist/`, exercising relative assets at a subpath like GitHub Pages.

Browser verification used the Codex in-app Chromium browser with actual viewport checks at **1366×768, 1366×900, 768×1024, 390×844 and 320×740**. Inspected home, maps, shop and mobile arena; measured no horizontal page overflow at these widths. Tested first-time welcome/tutorial, both readiness orders, selector cancel/refund and deadline closure, automatic round progression, a completed victory (+120) returning home, skin purchase/equip (340 → 40), pose preview, reload persistence, reduced-motion and sound controls. No captured browser console errors or warnings during these checks. Map purchase and all loss-penalty combinations are covered by automated tests; they were not all repeated through the browser UI.

Browser screenshots are local review artifacts under ignored `output/phase2b/`. Browser automation occasionally encountered control timeouts; subsequent state checks recovered. These are not counted as game errors or claimed as cross-browser coverage.

## Decisions and limitations

The blueprint's proposed values are initial tunable configuration, not permanent balancing commitments. Cancel-before-deadline refunds; expired reservations count toward completed-loss penalties. A wholly idle match has no spent charges and earns nothing. Intentional perk spending still counts for a completed-loss penalty even when the actual hands were auto-picked; manual-selection gating applies to positive rewards.

Home scenery caches static low-resolution art and animates small overlays, avoiding WebGL and new runtime dependencies. No hardware FPS or physical touch-device benchmark was performed. Chromium responsive emulation is not a Safari/Firefox or actual iOS/Android test. Audio controls were exercised, but audible quality was not independently assessed. No known failing automated tests or reproducible game errors remained after verification; broader device QA and balance review are still appropriate before release.

**Plus 1! is not implemented.** Future work can extend the ROUND_RESULT dispatch before the normal next-round/match-end decision. Creator approval is required for either Last Chance Overtime (match-point rescue, an exception to immediate first-to-three finality) or Bonus Duel (needs a defined prize/score modifier). Charges, simultaneous requests and match-end/tie handling remain undecided. No active control or invented scoring behavior ships.

Real multiplayer, authoritative online currency and cross-device saves remain outside scope. The main branch and production Pages deployment must only change after review and an approved merge.

## Preview and release

Run `node scripts/serve.mjs`, then open `http://127.0.0.1:8000`. For a packaged build run `node scripts/build.mjs`; the existing source server can preview it at `http://127.0.0.1:8000/dist/`. Alternatively stop that server and run `node scripts/serve.mjs dist`.

After reviewing and merging the branch, the existing GitHub Pages main/root configuration can publish the update. Verify the deployed game and migration on its original origin; localhost saves are separate from the live game's saves.
