# Original arcade announcer — recording and integration kit

**Status: partially complete; four spoken recordings are missing.** No voice-production capability was available for this implementation. The game continues to use its original tonal preview WAVs and procedural supporting sounds. This document supplies the scripts, direction, timing, processing, provenance requirements, and integration steps for a future recording session. It does not claim that a performer has recorded or approved these lines.

## Performance brief

Create one original, confident arcade announcer for RPS GO!: powerful projection, clear consonants, controlled theatrical energy, and a satisfying rhythmic rise across four calls. Keep the same voice identity, vocal distance, room, microphone placement, and processing across all four files. The energy should grow from Rock to Shoot while their perceived loudness stays controlled. Character comes from performance and articulation, rather than excessive distortion or simply turning each file louder.

The only words are **ROCK!**, **PAPER!**, **SCISSORS!**, and **SHOOT!**. No introductory count, extra slogans, spoken punctuation, background music, crowd, or character name. Do not imitate a particular actor, celebrity, commercial game announcer, or existing recording. References to arcade energy describe the delivery, not a voice to copy.

Record at least three takes of each line as one coherent session: controlled, energetic, and maximum controlled intensity. Select a cohesive four-line set, then approve it as a sequence. No take is pre-approved by this document.

## Timing against the existing game

The current `CONFIG.timing.shake` is 1,350 ms. Three equal beats therefore last **450 ms** each. `CONFIG.timing.shoot` is **700 ms**. These gameplay timings are preserved. The following offsets are nominal presentation targets measured from entry into `HAND_SHAKE`; actual phase timestamps remain authoritative.

| Event | Nominal onset | Next event | Recommended spoken body | Maximum complete runtime file |
| --- | ---: | ---: | --- | ---: |
| ROCK! | 0 ms | PAPER at 450 ms | 180–280 ms | 400 ms |
| PAPER! | 450 ms | SCISSORS at 900 ms | 240–330 ms | 400 ms |
| SCISSORS! | 900 ms | SHOOT at 1,350 ms | 280–360 ms | 400 ms |
| SHOOT! | 1,350 ms | Reveal at 2,050 ms | 300–480 ms | 650 ms |

File limits include initial silence, breath, consonant release, processing, delay, and reverb. Leave approximately 50 ms of room before the next phase. Trim leading silence to 0–10 ms without cutting the attack. Add short click-preventing edge fades where necessary. Natural intelligibility matters more than hitting the middle of the suggested body-duration range.

The player may lock early or wait for the deadline; either route reaches the same beat sequence. Ties, subsequent rounds, rematches, and reduced motion use the same cue ordering. Audio must not hold a phase open, reveal a secret move, or change the 20-second decision deadline. Late or skipped visual beats must not be replayed as a backlog of speech after returning from a background tab.

## Recording-ready scripts and direction

### 1. ROCK!

**Exact script:** `ROCK!`

Open the sequence with a compact, grounded call. Give the R a clean attack, a full but short vowel, and an audible K release. Moderate intensity establishes confidence and leaves room to build. Avoid a long growl, exaggerated rolled R, or breathy lead-in. The supporting bass thump supplies weight; the voice should remain intelligible on small speakers.

**Original-voice production prompt:**

> Perform only “ROCK!” in an original confident arcade-announcer voice. One short, projected call with a crisp attack and clear final consonant. Grounded, powerful, energetic, controlled; first step of a four-beat buildup. Aim for a 180–280 ms spoken body and finish the entire edited clip within 400 ms. Dry isolated voice, no music, no extra words, no imitation of any named person or commercial character. Use the same original voice identity intended for the other three calls.

**Delivery file:** `assets/audio/announcer_rock.wav`

### 2. PAPER!

**Exact script:** `PAPER!`

Increase confidence and anticipation slightly. Clearly articulate both syllables, with stress on the first and a compact second syllable. The second P must remain audible. Avoid stretching the final syllable or adding an upward questioning inflection. Match Rock's vocal distance and tonal character.

**Original-voice production prompt:**

> Perform only “PAPER!” using the same original arcade-announcer voice as ROCK. Two clear syllables, confident first-syllable stress, slightly greater excitement and forward momentum. Strong projection without a loudness jump. Aim for a 240–330 ms spoken body and finish the entire edited clip within 400 ms. Dry isolated voice, no music or additional words, no imitation of an identifiable performer.

**Delivery file:** `assets/audio/announcer_paper.wav`

### 3. SCISSORS!

**Exact script:** `SCISSORS!`

Build the last step of tension. Keep the initial S crisp but not piercing, both syllables recognizable, and the final sound controlled. Increase vocal intent instead of rushing the word. Do not swallow the second syllable to fit the beat. The rising electronic accent should sit behind the voice.

**Original-voice production prompt:**

> Perform only “SCISSORS!” in the same original voice and recording perspective as ROCK and PAPER. The final buildup: precise consonants, clear two-syllable pronunciation, more dramatic intent, tightly controlled intensity. Aim for a 280–360 ms spoken body and finish the complete edited clip within 400 ms. Keep sibilance smooth and intelligible. Dry isolated voice, no extra words, no recognizable-actor imitation.

**Delivery file:** `assets/audio/announcer_scissors.wav`

### 4. SHOOT!

**Exact script:** `SHOOT!`

Deliver the climax with the strongest attack and most committed projection. Keep SH intelligible, the vowel full but compact, and the final T audible. Use a deliberate theatrical release rather than an uncontrolled scream. A short processed tail can support the shockwave, but the complete file must end before the reveal. The impact sound supplies the deepest bass; avoid muddying the vocal with excessive low-frequency boost.

**Original-voice production prompt:**

> Perform only “SHOOT!” using the same original announcer as the three buildup calls. This is the climax: explosive clean attack, powerful projection, confident controlled theatrical finish, and a clear final T. Aim for a 300–480 ms spoken body. Supply a dry take first; the final processed runtime file, including any brief cinematic tail, must fit within 650 ms. No extra words, music, borrowed samples, or imitation of a recognizable actor.

**Delivery file:** `assets/audio/announcer_shoot.wav`

## Capture and file delivery

Record clean mono source masters at **48 kHz / 24-bit PCM WAV**, or **44.1 kHz / 24-bit** if that is the recording session's native format. Keep headroom while capturing; avoid clipped transients and destructive processing on the only master. Save both the selected dry take and a processed master outside the runtime folder. Retain the actual recording date, take identifier, and production notes.

Export the four runtime files as mono **48 kHz or 44.1 kHz, 16-bit PCM WAV** using the exact filenames above. Keep sample rate and processing consistent across the set. Dither once if reducing from a higher-bit-depth master. Do not upsample the existing 22.05 kHz tones and label them as voice recordings.

At 48 kHz mono/16-bit, a 400 ms file is about 38 KB and a 650 ms file about 62 KB, plus the small WAV header. The whole proposed set can stay around 180 KB. Compressed duplicates are optional; first measure whether they provide a useful benefit. If added, document the encoder, measured size, decode behavior, and playback delay on supported browsers. Do not introduce a new runtime dependency merely to encode four short files.

## Suggested processing chain

These are starting points to audition, not claims about completed mastering:

1. Edit mouth noise and excess silence conservatively. Preserve consonant attack and natural tone. Use very short edge fades to prevent clicks.
2. Apply a gentle high-pass filter only as needed for rumble, initially around 70–100 Hz. Reduce a muddy band if present rather than automatically boosting bass. Add a small presence adjustment only if intelligibility needs it.
3. Use light compression, initially around 2:1–3:1 with roughly 2–4 dB of gain reduction on stronger phrases. Retain the initial attack; compare at matched loudness.
4. Control excessive sibilance, especially in SCISSORS and SHOOT. Avoid dulling the consonants that distinguish the words. A light de-esser may help; set its range by listening to the actual voice.
5. Add subtle saturation only if useful. Keep a dry comparison and remove processing that blurs the articulation.
6. Keep Rock/Paper/Scissors almost dry. For SHOOT, audition a low-level short room or plate tail and, optionally, one brief delay. Print any effect inside the 650 ms limit. Do not let a wet tail mask the hand reveal.
7. Use a final limiter with a conservative ceiling such as **−1 dBTP**, then check the exported file for clipped samples and audible artifacts. Match perceived loudness by listening to the four-line sequence. Integrated loudness readings alone are unreliable as a sole matching criterion for such short clips.

Audition on headphones and ordinary laptop/phone speakers, at moderate volume and low volume. Listen with the actual supporting SFX at the game's default volume settings. Speech should lead; impact transients, bass, and sweeps should support it. Recheck global mute and both independent volume controls after integration.

## Provenance and approval record

The shipped preview WAVs are generated by `scripts/create-audio-previews.mjs`. Supporting SFX are generated from repository synthesis code in `src/ui/sfx-design.js` and played by `src/ui/sound.js`. Neither source uses sampled third-party recordings. No voice performer, recording service, or spoken asset license has been supplied or verified for this milestone. This document does not assign a license to future material.

For each future spoken file, record:

| Field | Required information |
| --- | --- |
| Asset and script | Exact filename and spoken words |
| Creator / source | Performer and producer, or authorized synthetic voice provider/model identifier |
| Production evidence | Recording/generation date, selected take or source record, processing summary |
| Permission basis | Permission/release or applicable terms allowing this project's intended public game use; store a verifiable reference |
| Restrictions | Any attribution, distribution, modification, territory, or commercial-use conditions |
| Technical metadata | Rate, channels, bit depth, duration, size, SHA-256 |
| Approval | Project creator's approval date and approved version/hash |

Use original or appropriately authorized recordings. Do not extract commercial game audio or clone a recognizable performer. Do not enroll in a paid voice service without the creator's approval. Until suitable source and approval records exist, keep production status as `missing` and keep the runtime voice mapping disabled.

## Integration when recordings arrive

1. Check that all four scripts, voice identity, duration limits, and file formats match this kit. Audition the complete sequence at the unchanged 450/450/450/700 ms phase spacing.
2. Place the approved runtime WAVs in `assets/audio/`. Preserve the four `*-preview.wav` fallback files.
3. Open `src/ui/audio-config.js`. Change only the corresponding `ANNOUNCER_VOICES` entries from `null` to relative URLs using the existing module URL pattern. For example, Rock's supplied file resolves with `new URL('../../assets/audio/announcer_rock.wav', import.meta.url).href`. Use the same pattern for Paper, Scissors, and Shoot. Keep any unsupplied entry `null`; do not point at a nonexistent file.
4. Update `assets/audio/manifest.json`: mark actually supplied recordings available, record their measured metadata/hash, source/permission reference, and creator approval. Keep the distinction between spoken recordings, tonal fallbacks, and procedural effects explicit.
5. Keep the existing `src/ui/announcer.js` cue tracking, preload/cache, audio unlock, bounded playback, cleanup, and fallback path. Do not lengthen the match sequence to fit a recording. Audio configuration references existing gameplay timing rather than replacing it.
6. Run `node --test` and `node scripts/build.mjs`. Check the built audio URLs under the GitHub Pages project prefix `/rps-go/`, not just the repository root.
7. In a separate browser preview, verify one spoken cue per visual beat, no overlapping prior cue, early lock/deadline/tie/rematch behavior, background-tab return, reduced motion, mute, volume persistence, navigation cleanup, and unavailable-file fallback. Verify no failed requests for disabled/null voice entries.
8. Document actual listening and browser test results, then commit the recordings and metadata to a review branch. Keep the announcer pull request open for the creator's approval.

## Completion checklist

- [ ] Four original spoken files delivered using the exact filenames.
- [ ] Same voice identity and clear pronunciation across the full sequence.
- [ ] Complete runtime files fit within 400/400/400/650 ms.
- [ ] Clean endings, consistent perceived loudness, no clipping or intrusive effects.
- [ ] Source, permissions, measured metadata, and creator approval recorded.
- [ ] `ANNOUNCER_VOICES` enabled only for files actually present.
- [ ] Unit, asset-loading, build, and browser checks completed and reported truthfully.
- [ ] Creator has approved the final spoken performance and the new pull request.

The spoken-production checklist is intentionally incomplete. The fallback and supported audio-engine work can be reviewed while those recordings remain outstanding.
