# RPS GO! audio assets and production status

**Spoken announcer production is incomplete.** No spoken voice recordings have been generated, supplied, or approved. The four shipped WAVs are tonal previews; procedural supporting effects are synthesized by Web Audio. Neither is a substitute for the missing spoken performance.

The playable fallback remains available while the original announcer is recorded. See the [recording-ready scripts and integration guide](../../docs/announcer-recording-kit.md) and [machine-readable asset manifest](manifest.json).

## Shipped fallback files

| Cue | File | Duration | Format | Size |
| --- | --- | ---: | --- | ---: |
| Rock | `rock-preview.wav` | 220 ms | Mono, 22,050 Hz, 16-bit PCM WAV | 9,746 bytes |
| Paper | `paper-preview.wav` | 249.98 ms | Mono, 22,050 Hz, 16-bit PCM WAV | 11,068 bytes |
| Scissors | `scissors-preview.wav` | 280 ms | Mono, 22,050 Hz, 16-bit PCM WAV | 12,392 bytes |
| Shoot | `shoot-preview.wav` | 420 ms | Mono, 22,050 Hz, 16-bit PCM WAV | 18,566 bytes |

These files total 51,772 bytes. They were synthesized directly by the repository's `scripts/create-audio-previews.mjs`, using sine-wave fundamentals, harmonics, and an amplitude envelope. They contain no speech or sampled third-party recordings. Run `node scripts/create-audio-previews.mjs` to reproduce the tones; do not run it expecting announcer speech.

Supporting impacts and UI sounds are generated in `src/ui/sfx-design.js` as cached PCM buffers played by `src/ui/sound.js`. Their source is repository code, not recorded samples. They do not require additional downloaded SFX files. The manifest records this provenance without making an unverified license claim.

## Missing spoken files

- `announcer_rock.wav`
- `announcer_paper.wav`
- `announcer_scissors.wav`
- `announcer_shoot.wav`

Record all four using the same original performer or consistently directed authorized synthetic voice. Do not copy commercial recordings or request an imitation of a recognizable actor. Before adding recordings, document their creator/provider, source, applicable usage permission or terms, production date, and the project creator's approval. Those records have not been supplied for any future spoken assets.

## Runtime integration

`src/ui/audio-config.js` centralizes cue filenames, fallback mappings, and audio synchronization configuration. Its `ANNOUNCER_VOICES` entries remain `null` until actual recordings are present. A null entry is deliberately not requested, so missing production files do not generate speculative 404s.

When approved recordings arrive, place them in this directory, enable the corresponding relative URLs in `ANNOUNCER_VOICES`, and update `manifest.json` with measured file metadata and provenance. Keep the fallback WAVs. The announcer loader can then use supplied speech while retaining graceful fallback if a file cannot load or decode.

The established `HAND_SHAKE` sequence is 1,350 ms, with one cue every 450 ms. SHOOT lasts 700 ms before reveal. Audio follows those existing phase clocks; playback must never extend them. Global mute and independent saved SFX/announcer volume settings apply. Follow the recording kit's duration limits so later cues do not cut off words.
