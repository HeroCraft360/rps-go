# RPS GO!

**Rock. Paper. Scissors. Outsmart.** An original pixel-art arcade duel for desktop and mobile browsers. Built with HTML, CSS, JavaScript modules and Canvas. No runtime dependencies, account, API keys or backend.

## Play locally

With Node.js 20 or newer:

```sh
node scripts/serve.mjs
```

Open **http://127.0.0.1:8000**. Alternatively, run `python -m http.server 8000` from the project directory. ES modules need HTTP; opening `index.html` directly with `file://` is unsupported.

## How to play

- First to **3 round wins** wins the match. Ties count for neither side and can extend a match beyond five rounds.
- Every round shares a **20-second** clock. Select Rock, Scissors or Paper. **SHOOT** privately locks your choice. BYTE locks independently; after your lock its pending decision accelerates to 1–3 seconds (or its earlier plan/shared deadline). Once both are ready, a short BOTH READY cue starts the complete showdown early.
- Keyboard: **1** Rock, **2** Scissors, **3** Paper; **Enter / Space** locks your move. **Escape** closes a panel.
- If you don't lock, your highlighted move is used at zero. If you don't select anything, the game makes a random **AUTO PICK**.
- **Sike Out!** broadcasts a public claim, independently of your real move. Two charges per match, at most one spent attempt per round. Opening reserves a charge; submitting spends it. Canceling before zero refunds it. Leaving the selector open at zero spends it without sending a claim. If BYTE locks before submission, the pending charge is refunded automatically. A new bluff cannot start after BYTE locks. The clock continues in panels.
- BYTE uses only your last five *revealed* moves and public claims received before its own lock. It cannot inspect your current private choice. Its animated bluff alert states a public claim only; “It's a lieeeeee...” does not tell you whether its eventual move will match that claim.
- Hands shake three times, a large SHOOT! appears, then both actual moves reveal. Scoring happens exactly once.

## Coins, home maps and skins

Start with 0 GO Coins. A completed victory with at least one manually selected hand earns **120**. A completed defeat earns **0**, and deducts **25 per submitted or expired player bluff**, capped by your balance. Timely canceled reservations and BYTE's bluffs cost nothing. Settlement occurs once. Abandoned matches have no settlement. Completely idle matches earn nothing; intentionally spending a bluff counts for loss penalties even if every actual hand was auto-picked.

Returning players enter a personal home hub. Victories celebrate for three visible seconds, then return home; RETURN HOME skips the wait and STAY HERE cancels it. Defeats offer manual home/rematch navigation. Preview all three poses and skins without buying them; purchases equip the new cosmetic. Arcade Classic is free, Neon Circuit costs 300, and Solar Flare costs 650. The showcase uses the same hand renderer as the arena.

Home maps share the skin wallet: **Neon Launchpad (free), Circuit Sanctuary (700), Starlight Hangar (1,400)**. Each has original 2D scenery. Maps and skins provide no gameplay advantage.

**Proposed, tunable Phase 2B defaults:** the 25-coin loss fee, 4–15 second BYTE decision range, 70% later-round bluff chance, 400 ms both-ready cue, 5.5-second incoming alert, three-second victory return, and map catalog live in `src/config.js`. Cancel refunds, expired-attempt penalties and no abandonment settlement follow the blueprint's recommended policy. They are initial defaults, not permanently locked balancing decisions.

Progress now saves under `rpsgo.save.v2`. Valid v1 coins, owned/equipped skins, settings and tutorial progress migrate with the free base map. **The original `rpsgo.save.v1` record stays intact as a backup.** A valid v2 record takes precedence; invalid/unreadable v2 falls back to v1. Explicitly confirming RESET LOCAL SAVE clears both generations. Saves are local to this browser/origin, not synced between devices. If storage is blocked, play continues for the session. Reduced motion initially follows the system setting.

## Test and build

```sh
node --test
node scripts/build.mjs
node scripts/serve.mjs dist
```

Tests use injected clocks and randomness to cover all nine outcomes, extended ties, early readiness in both orders, deadline races/backgrounding, private locks, bluff reservation/expiry, BYTE fairness, signed settlement, purchase guards, migration/backup and visible-time home return. `dist/` contains only game files and licensed/original assets; reference images and handoff documents are never deployed. See [Phase 2B review notes](docs/phase-2b-review.md) for executed checks and limitations.

## Deploy to GitHub Pages

The app uses relative URLs throughout and works at a repository subpath such as `https://USERNAME.github.io/rps-go/`.

1. Review and merge the current feature branch when approved. This update does not merge or change production automatically.
2. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select **main** and **/ (root)**, then Save. The root is directly playable; a build is optional.
3. Wait for the Pages deployment in **Actions**. Open the published URL listed in Settings → Pages.

For a release with only production assets, run the build and publish the contents of `dist/` instead. See [GitHub's Pages publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Source map

- `src/config.js`: timing, economy, bot probabilities, catalog and other tunables.
- `src/core/`: pure rules, explicit match state machine, isolated bot strategy, perks, save validation and economy.
- `src/render/`: original scan-converted pixel art, per-skin geometry/ornaments and arena animation.
- `src/main.js`, `src/ui/`: state-driven UI, modal navigation, keyboard controls and synthesized sound.
- `src/styles/`: responsive pixel UI, reduced-motion handling and typography.
- `tests/`: dependency-free Node tests.
- `scripts/`: local server and production packaging.

The state sequence is PRE_ROUND → CHOOSING / LOCKED → BOTH_READY (or deadline) → HAND_SHAKE → SHOOT_OVERLAY → REVEAL → ROUND_RESULT → next round or MATCH_RESULT. Independent private lock fields publish only on REVEAL. Public events expose readiness and submitted claims, never hidden truth. A monotonic deadline prevents extra thinking time when backgrounded; on return, the locked round completes with visible animation beats. A single animation-frame loop drives the view. Home-return timing belongs to a separate cancelable controller keyed to the completed match.

**Plus 1! is intentionally absent.** The extension point is the transition after ROUND_RESULT, before normal next-round/match-result dispatch. Scoring, settlement, bot policy and UI must be extended together only after approval. The two candidate models are Last Chance Overtime (a match-point rescue that changes normal first-to-3 finality) and Bonus Duel (requires an explicit prize/scoring rule). No dormant button, score modifier or extra-round behavior ships here.

The renderer accepts independent player and opponent skin identifiers, and the bot has a controller boundary for future multiplayer. **V1 is bot-only.** Online rooms, accounts and cross-device saves are not implemented; Multiplayer is explicitly marked Coming Soon. Local currency is a browser prototype, not a tamper-proof online economy.

## Art and credits

BYTE and Arcade Classic use the six official, creator-supplied Phase 2A PNGs, unchanged and already oriented inward. Neon Circuit and Solar Flare now use six original premium PNGs under `assets/hands/part3/`, with cyan circuit plating and molten solar armor respectively. All 12 sprites share the same cache and renderer. The original procedural hands also provide a non-blocking fallback while PNGs load or if loading fails. Scenery, UI artwork and synthesized sounds remain original to this project. Reference-only images and artwork masters are excluded. **Press Start 2P** by CodeMan38 is bundled locally under the SIL Open Font License; see `assets/fonts/OFL.txt` and the [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/pressstart2p). No remote fonts or images are needed while playing.

See [Phase 2A hand artwork review](docs/hand-art-review.md) for all six in-game poses, mobile views, fallback checks, implementation details and reproduction instructions.

See [Sike Out! notification review](docs/sike-out-review.md) for the larger incoming claim, early-ready compact state, desktop/mobile screenshots and verification details.

## Phase 2A Part 3 review

See [complete implementation and verification report](docs/phase-2a-part3-review.md) for screenshots, art provenance, behavior changes, and limitations. Recent Rounds shows the last six completed rounds, including actual moves, separately labeled claims and auto-picks. The alert is centered over the timer and compacts through SHOOT. Cinematic effects are bounded and disabled by reduced motion.

The four local announcer assets are **original synthesized preview cues, not voice recordings**. SFX and announcer cue volumes are saved independently and additively. See [audio integration](assets/audio/README.md) to substitute authorized spoken clips.

For reproducible isolated browser review, run `node scripts/part3-review.mjs` then visit `/output/part3-review/` on the local server. Its QA toolbar controls the real engine clock; its separate session-only save starts at 5,000 coins and never reads or spends your normal save. Review controls, reports and screenshots are excluded from `dist/`.

## Phase 3 audio review (partial — spoken recordings pending)

The audio branch adds distinct original Rock/Paper/Scissors impacts, a layered SHOOT burst, and selected UI/result cues. It keeps the four tonal preview WAVs while the original spoken performance is produced. **No spoken announcer files are included.**

Audio follows the existing 450 ms countdown beats and 700 ms SHOOT phase. Global mute stops both channels, their saved volumes remain independent, and navigation/backgrounding clears active sounds without replaying missed cues. Settings now includes TEST SFX and TEST CUE buttons.

See the [audio implementation report](docs/phase-3-audio-review.md), [asset manifest](assets/audio/manifest.json), and [recording kit](docs/announcer-recording-kit.md). Run `node scripts/audio-review.mjs` for the isolated audio review copy, then open `/output/part3-review/` on the local server. Its diagnostic buttons and controlled clock are excluded from the production build.
