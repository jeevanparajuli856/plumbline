# Plumbline video storyboard (2:45, nine shots)

Date: 2026-10-25. Target: the Nexus application video and the semifinal review. Recorded by a Playwright
script in presentation mode (`?present=1`: chrome hidden, dark theme, dpr 1.75, type scaled 1.25x), narrated
by the founder from the script below. Nothing in the video is a mockup; every frame is the running app.

Rules carried from `docs/PITCH.md` section 7: no number appears unless it comes from a fixture, a `docs/results/`
file, or a cited paper. Simulated content carries a visible SIMULATED badge for the whole shot. Customer
validation appears as PENDING with a date, never as a result.

## 1. Shot table

Narration is written to be spoken at a natural pace, about 2.5 words per second. First person plural, plain register.

| # | Time | On-screen | URL or mechanism | Narration (founder records) | Must exist in the app |
|---|---|---|---|---|---|
| 1 | 0:00-0:15 | Landing mast. One sentence on a dark bench. The plumb line swings at full amplitude (max entropy). Fade in from black. | `/?present=1`, script `video-v1` holds scroll at the `mast` section (landing sections are addressed by id) | "Every measuring tool assumes the probe is where you put it. For someone who cannot see their hands, that assumption is the whole problem. We built an assistant that does not make it." | Landing route, `PlumbLine` at max amplitude, mast section with caption twin, presentation mode hides header and footer |
| 2 | 0:15-0:35 | Problem section. Probe trembles over row 3; a dashed bracket spans rows 1 to 5. Two pull quotes fade in with sources: Participant 23 (ASSETS 2024) and amyk (EEVblog 2014). | `/?present=1`, script scrolls to the `problem` section | "A blind user in a 2024 Michigan study put it this way: she cannot tell whether the mistake is hers or the machine's. On an electronics forum in 2014, an engineer looking for a talking multimeter was told, he can't see the probes, I can't imagine this going well. Talking meters exist now. The display was solved. The probe never was." | Problem section, tremor amplitude tied to 1 - P(l=n), quote components with source text in DOM |
| 3 | 0:35-1:15 | The simulator. Side-by-side: Plumbline left, Published method right. Instruction "Touch row 3" appears and is captioned. Probe lifts, lands on row 2 (amber fill), told row 3 keeps its cyan outline. Reading 3.671 V enters the log. Right panel jumps to R2 shorted, 100%. Left panel shows a spread belief with `R3_short` at 63.1% (`worked_example.json`, step 1). | `/sim?demo=worked-example&present=1`, script presses `P` to play at the default 1800 ms pace, pauses after step 1 | "Here is the whole idea in one example. One resistor on this board is ten times too small. Both systems ask for row 3. The hand lands on row 2. The meter reads 3.671 volts. The published method trusts the row and is now completely certain R2 is shorted. It is wrong. Plumbline does not trust the row. The reading itself tells it where the probe really was." | `SimPage` in replay mode with `worked_example` fixture, `SideBySide`, `ReadingLog`, `BeliefChart` two series, reveal animation with `finishReveal(token)`, `P` play with pacing |
| 4 | 1:15-1:30 | Warning banner slides in, vermilion left rule, glyph and the word Warning. Text: "That reading did not come from row 3. It most likely came from row 2." Caption mirrors the spoken phrase. Told-row outline turns vermilion. | same session, script holds on the warning | "So it says so. Your probe is not where you think it is. It most likely came from row 2. And it asks for one more reading instead of guessing." | `WarningBanner` role alert, `placement.warning.active` from the fixture, announcer phrase shared with voice |
| 5 | 1:30-1:45 | Second reading 0.338 V enters. Left panel resolves: R3 ten times too small, confidence from the fixture. Plumb line settles over R3. Diagnosis card with spoken text captioned. | same session, script presses `]` to step | "Second reading, 0.338 volts. R3 is ten times too small. Correct. Two readings, one warning, no guess." | `DiagnosisCard`, `status: resolved`, plumb line rest pose over the diagnosed component |
| 6 | 1:45-2:00 | Unresolved fixture. Belief bracket spans two candidates: LED open and LED reversed. Status "unresolved". Plumb line oscillates between the two parts. Refusal text captioned. | `/sim?mode=replay&fixture=unresolved_pair&present=1`, script plays to the end | "And when two faults produce exactly the same voltages at every row, it does not pick one. It tells you it cannot separate them, and it stops. Refusing to guess is a feature." | `unresolved_pair` fixture, `BeliefChart` unresolved bracket, `PlumbLine` alternating rest, unresolved phrase |
| 7 | 2:00-2:20 | Thermometer domain. Lathe cross-section of a roast, six depth bands, axial probe. Persistent SIMULATED MODEL badge in the corner and in the scene. Told 5.5 cm, lands 3.5 cm. Step 1 shows no warning (P(off site) 0.059, `thermometer_demo.json`). Step 2 recovers; the retrospective audit row says the first reading came from about 3.5 cm. | `/sim?domain=thermometer&mode=replay&present=1`, script plays `thermometer_demo` | "The same engine runs on a different instrument. This one is a simulated kitchen thermometer, and we label it that way. Here the probe is told 5.5 centimeters and lands at 3.5. From one reading the model honestly cannot tell, because the temperature profile looks the same shifted. On the second reading it recovers, and the audit says the first reading came from about 3.5 centimeters. We show that because it is true, not because it is flattering." | `thermometer` domain in the catalog, roast scene, SIMULATED badge, `placement_audit` rendered as a row in the log |
| 8 | 2:20-2:35 | Evidence table. Built items marked DONE with commands. Row "Measured with blind users: PENDING, regional blindness training center, protocol 8 x 20 placements, date." Dated LLM transcript exhibit visible below. | `/evidence?present=1` | "Everything built is listed with the command that reproduces it. The one thing we have not done yet is the thing that matters most. No blind person has used this. A regional blindness training center has been asked to help us measure how blind hands actually place a probe. That row says pending, and it will say pending until it is done." | `EvidenceTable` from `docs/EVIDENCE.md`, PENDING badge, `TranscriptExhibit` with a date |
| 9 | 2:35-2:45 | Close. The sentence "It cannot tell you something it has not measured." Plumb line at rest. Team names, university, repository URL. | `/?present=1`, script scrolls to the `close` section | "Plumbline. It cannot tell you something it has not measured. Jeevan Parajuli and Pankaj Bhatta, University of Louisiana Monroe." | Close section, static credits |

Total narration is roughly 380 words, which fits 2:45 at a calm pace. Trim shot 7 first if it runs long.

## 2. Recording procedure

### 2.1 Capture (Playwright)

Script: `apps/web/e2e/record/video-v1.ts` (lane `e2e`). It is not a test. It is run by the `record` project, which is only added when `PLUMBLINE_RECORD=1`, and it drives the nine shots with `recordVideo` at 1920x1080 and writes one WebM per shot plus `shots.json`.

```
cd apps/web
PLUMBLINE_RECORD=1 pnpm exec playwright test --project=record
# against a deployed site (no local preview server is started):
PLUMBLINE_RECORD=1 PLUMBLINE_E2E_BASE_URL=<deployed web URL> pnpm exec playwright test --project=record
```

Without `PLUMBLINE_E2E_BASE_URL`, Playwright builds and serves the app itself (`vite preview`).

Output: `apps/web/recordings/video-v1/shot-<n>.webm` and `shots.json`. Each WebM starts at page load, so `shots.json` gives `start` and `end` (seconds into that file) for the part that belongs to the shot. Trim with those values before concatenating (section 2.2). The `**/recordings/` folder is gitignored.

Settings the script uses:
- `viewport: { width: 1920, height: 1080 }`, `deviceScaleFactor: 1`, `recordVideo` at the same size.
- `colorScheme: 'dark'`, `reducedMotion: 'no-preference'`.
- Each shot navigates to its URL with `&script=video-v1&shot=<n>`. Readiness is the scene frame counter: the script waits up to 10 s for `window.__plumblineScene.frames > 0` (set by `scene/perfProbe.ts`; there is no scene-ready element id). If the scene never reports, the shot continues on the text channel.
- Landing sections are scrolled to by id (`mast`, `problem`, `close`, and so on), never by index.
- Replay pacing is driven through the store (`replayPlay()` at the default 1800 ms pace, `DEFAULT_PACE_MS`), never by wall-clock sleeps inside the app. Key presses (`P` to play, `]` to step) use fixed waits so timings are reproducible.

The recording project and the scene counter are on lane branches (`e2e`, `scene`) at the time of writing; they are not on main at 9a997a5.

### 2.2 Encode (ffmpeg)

Trim each shot to its `start` and `end` from `shots.json` (a shot dropped for a missing fixture is absent from the file), concatenate the trimmed WebMs in order, then transcode to H.264 MP4 at 30 fps:

```
cd apps/web/recordings/video-v1
for n in $(jq -r '.shots[].shot' shots.json); do
  s=$(jq -r ".shots[] | select(.shot==$n) | .start" shots.json)
  e=$(jq -r ".shots[] | select(.shot==$n) | .end" shots.json)
  ffmpeg -y -ss "$s" -to "$e" -i "shot-$n.webm" -c:v libvpx-vp9 -b:v 0 -crf 30 "trim-$n.webm"
done
for n in $(jq -r '.shots[].shot' shots.json); do echo "file 'trim-$n.webm'"; done > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -r 30 -an video-v1-silent.mp4
```

Mix the voiceover after it is recorded:

```
ffmpeg -i video-v1-silent.mp4 -i voiceover.wav -c:v copy -c:a aac -b:a 192k -shortest video-v1.mp4
```

Check the result in a logged-out browser before upload (dossier submission check: the share link must play).

### 2.3 Voiceover

- Record in one sitting, in a quiet room, phone or USB mic 15 to 20 cm from the mouth, 48 kHz WAV.
- Read each shot's narration as a separate take, leave two seconds of silence between takes, then align each take to its shot's start time from `shots.json`.
- Speak slower than feels natural. If a take runs past its slot, cut words, do not speed up.
- Say numbers as they appear on screen: "three point six seven one volts", "zero point three three eight volts".
- No music. The product is a voice channel; the voice should be the only sound.

### 2.4 Captions

Generate an SRT from the narration column using the start and end times of each shot; split any cue longer
than 84 characters at a sentence boundary. Upload the SRT with the video or burn it in:

```
ffmpeg -i video-v1.mp4 -vf "subtitles=video-v1.srt:force_style='FontName=IBM Plex Sans,FontSize=20,Outline=1'" -c:a copy video-v1-captioned.mp4
```

Captions are not optional. The product is for people who cannot see; the video must also serve people who cannot hear.

## 3. Fallback when a shot's fixture is missing

Priority is a video that exists on time with nothing fake in it.

| Missing | Fallback |
|---|---|
| `worked_example` fixture not yet recorded by `record_fixtures.py` | No fallback. The provisional fixture was retired at main 9a997a5, and shots 3 to 5 need the recording. Run `uv run --project engine python -m plumbline.record_fixtures` first. |
| `unresolved_pair` fixture missing | Drop shot 6; extend shot 5 by five seconds and add one sentence: "When two faults are electrically identical it reports unresolved instead of guessing." |
| `thermometer_demo` fixture or roast scene missing | Drop shot 7; extend shot 8 by ten seconds and show the Evidence row "Second instrument (simulated): IN PROGRESS." Do not show a static image of a thermometer. |
| `/evidence` page not built | Show `docs/EVIDENCE.md` rendered in the browser at the same URL slot; the PENDING row must still be visible. |
| 3D scene unavailable in headless Chromium | Record with `view=text`. The text channel is the product; narrate the same script. |
| Playwright recording fails | Screen-record Chrome manually at 1920x1080 with the same URLs and key presses; note "manual capture" in the upload checklist. |

## 4. Upload checklist (application and semifinal)

The Jotform asks for a shareable team video and high-resolution prototype photos or screenshots.

Video:
- [ ] `video-v1.mp4` plays in a logged-out browser from the share link.
- [ ] Captions present (SRT or burned in).
- [ ] No number on screen that is not in a fixture, `docs/results/`, or a cited paper.
- [ ] SIMULATED badge visible for the whole of shot 7.
- [ ] PENDING row visible in shot 8.
- [ ] Credits name both team members and the university.

High-resolution screenshots (1920x1080 or larger, PNG, taken with `?present=1`, each annotated input, operation, output):
- [ ] `01-landing-mast.png`: the one sentence and the plumb line.
- [ ] `02-sim-instruction.png`: "Touch row 3" with the probe aimed; shows the input side.
- [ ] `03-sim-reading-entered.png`: 3.671 V in the log, side-by-side beliefs; the core operation.
- [ ] `04-sim-warning.png`: the placement warning banner and the vermilion told-row outline.
- [ ] `05-sim-diagnosis.png`: R3 10x low resolved, plumb line at rest; the output.
- [ ] `06-sim-unresolved.png`: the refusal with the two-candidate bracket.
- [ ] `07-thermometer-simulated.png`: roast cross-section with SIMULATED badge and the audit row.
- [ ] `08-evidence-pending.png`: evidence table with the PENDING row and date.
- [ ] `09-text-channel.png`: `view=text`, the same session with no 3D, to show the product works without the scene.
- [ ] `10-breadboard-photo.jpg`: the real breadboard built to the netlist, once it exists (Sprint 3). Until then, omit; do not substitute a render.

Also attach: the repository URL, the deployed URL (`/sim?demo=worked-example`), and the `docs/results/` file names referenced on screen.
