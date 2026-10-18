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
- Every round gives you **10 seconds**. Select Rock, Scissors or Paper. **SHOOT** locks your choice, and the reveal waits for the deadline.
- Keyboard: **1** Rock, **2** Scissors, **3** Paper; **Enter / Space** locks your move. **Escape** closes a panel.
- If you don't lock, your highlighted move is used at zero. If you don't select anything, the game makes a random **AUTO PICK**.
- **Sike Out!** broadcasts a public claim, independently of your real move. Two charges per match, at most one per round. Canceling is free; the countdown keeps running in the selector and other panels.
- BYTE uses only your last five *revealed* moves and public claims. It cannot inspect your current private choice. BYTE can also send potentially deceptive tells in later rounds.
- Hands shake three times, a large SHOOT! appears, then both actual moves reveal. Scoring happens exactly once.

## Coins and skins

Start with 0 GO Coins. Finish a victory for 120 coins or a loss for 50, provided you manually selected a hand at least once. Abandoned matches and entirely automatic matches earn nothing. Arcade Classic is free; Neon Circuit costs 300 and Solar Flare costs 650. Skins affect all three player hand poses, cuffs and forearms, with no gameplay advantage.

Progress is saved in this browser under `rpsgo.save.v1`. It includes coins, ownership, equipment, settings and tutorial completion. It is not synced between devices. Settings include sound, reduced motion (initially follows your system), instructions and a confirmed local reset. If storage is blocked, the game remains playable for the session.

## Test and build

```sh
node --test
node scripts/build.mjs
node scripts/serve.mjs dist
```

Tests use an injected clock and random source to cover all nine outcomes, extended ties, a 2–2 tie, exact match endings, input locking, timeouts/backgrounding, bluff consumption/cancel, bot fairness, one-time payouts, shop guards, persistence validation and clean replays. `dist/` contains only game files and licensed/original assets; reference images and handoff documents are never deployed.

## Deploy to GitHub Pages

The app uses relative URLs throughout and works at a repository subpath such as `https://USERNAME.github.io/rps-go/`.

1. Push the source to a public GitHub repository.
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

The state sequence is PRE_ROUND → CHOOSING / LOCKED → HAND_SHAKE → SHOOT_OVERLAY → REVEAL → ROUND_RESULT → next round or MATCH_RESULT. A monotonic deadline prevents extra thinking time when backgrounded; on return, the locked round completes with visible animation beats. A single animation-frame loop drives the view. Hidden bot choices never appear on the stage before REVEAL.

The renderer accepts independent player and opponent skin identifiers, and the bot has a controller boundary for future multiplayer. **V1 is bot-only.** Online rooms, accounts and cross-device saves are not implemented; Multiplayer is explicitly marked Coming Soon. Local currency is a browser prototype, not a tamper-proof online economy.

## Art and credits

All hand sprites, scenery, UI artwork and synthesized sounds are original to this project. The supplied reference images guided composition only and are excluded from the repository and published game. **Press Start 2P** by CodeMan38 is bundled locally under the SIL Open Font License; see `assets/fonts/OFL.txt` and the [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/pressstart2p). No remote fonts or images are needed while playing.
