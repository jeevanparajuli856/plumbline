# Truehand architecture

Status: v1, 2026-10-25, written before code; update through doc-updater when code lands.

The HTTP contract lives in `docs/API_CONTRACT.md` and is not repeated here. Decisions are in `docs/decisions/` (index: `docs/decisions/README.md`). Numbers come from the approved plan (Appendix A and B) or from a command; scratch numbers are labeled as scratch.

## 1. Shape

```
+------------------------------ apps/web (Vite, React 19, TS strict) -------------------------------+
|  landing/    scroll story, 8 sections, DOM captions; Play runs the replay (never autoplays)        |
|  sim/        simulator: instruction, reading input, warning, belief, log, text channel             |
|  evidence/   readiness table, figures, dated transcript     about/  team, DOIs, honesty note     |
|  scene/      one R3F Canvas (lazy): breadboard, probe, belief overlay, plumb line, roast          |
|  a11y/       liveRegion queue, announcer (the only event mirror), keyboard map, focus              |
|  voice/      voiceMachine reducer, speak/listen adapters, parseReading, phrases                    |
|  state/      Zustand store v1 (types.ts frozen at bootstrap), selectors, landing progress          |
|  engine/     client.ts (EngineClient), api.ts, schemas.ts (Zod), local/ (TS port, Sprint 3)        |
|  ui/ styles/ lib/ public/   panels, tokens.css, helpers, fixtures, transcripts, icons             |
+---------------------------------------------+------------------------------------------------------+
                                              | JSON over HTTP, /v1/*  (docs/API_CONTRACT.md)
+---------------------------------------------v------------------------------------------------------+
| engine/ (Python 3.13, uv, NumPy, FastAPI)                                                          |
|  truehand/        config, model, confusion, engine, session, baselines,                           |
|                    domains/{circuit,thermometer}, record_fixtures, experiments/                    |
|  truehand_api/    main, settings, schemas, errors, store, routers/{sessions,domains,health}        |
|  fixtures/parity/  nine recorded sessions, read by pytest and by vitest through @fixtures          |
+----------------------------------------------------------------------------------------------------+
```

The web app runs with or without the API and without WebGL. The text channel is the product; the 3D scene is for sighted judges.

### Routes

| Route | Query | Job |
|---|---|---|
| `/` | `?demo=worked-example` redirects to `/sim?demo=worked-example` | the story in one scroll |
| `/sim` | `domain`, `mode`, `demo`, `present=1`, `view=text\|scene\|both`, `fixture` | the product |
| `/evidence` | `present=1` | readiness table and dated transcript exhibit |
| `/about` | none | team, DOIs, honesty note, reproduce commands |

## 2. Run modes

The engine has three modes. The reveal setting decides when the true landed site becomes visible.

| Mode | Who supplies the reading | Who knows the landed site | `reveal` effect |
|---|---|---|---|
| simulate | server, from the circuit solver plus sigma noise, seeded | server, sampled from the confusion model | `after_step` returns `landed_site` after each step; `never` hides it |
| live | a person reads a real meter and speaks or types the value | nobody; the server reasons as it would for a blind user | no effect (`landed_site` is never returned) |
| replay | the fixture | the fixture | `after_step` reveals it; the web replay never touches the network |

Simulate is for development, the 3D sim, and the baseline comparison. Live is the research use. Replay is the worked example and must always work (rule 6 in `.claude/rules/00-truehand.md`).

## 3. Data flow for one step

1. Store phase `awaiting_reading`. The instruction (site, label, spoken form) is shown, spoken if speech is on, and announced politely. The scene outlines the told row in cyan.
2. The reading arrives by voice (`parseReading`), typed input, or the keyboard, or it is produced by the server (simulate) or the fixture (replay). Phase `submitting`.
3. `POST /v1/sessions/{id}/step`. The server updates the belief, the placement posterior, the warning, the next instruction by expected gain, and the shadow baseline.
4. The response is parsed with Zod. If `landed_site` is present and the scene can animate, phase `revealing`: the probe travels on the arc path to the landed row, then calls `finishReveal(token)`. Only `finishReveal` writes `reveal.landedSite`. Stale tokens are ignored. If the scene cannot animate (reduced motion, no WebGL), the store calls `finishReveal` itself. Without a landed site, phase moves straight to `reveal.next`.
5. The announcer mirrors each event once: warning (assertive), accepted and likely row (polite), diagnosis or refusal (polite). Speech only if the user turned it on.
6. Status `resolved`: diagnosis card gets focus and the diagnosis is spoken. Status `unresolved`: the refusal sentence names the indistinguishable pair and asks for another reading.

## 4. Domain-agnostic engine (`engine/truehand/`)

The engine knows nothing about circuits. A domain is a plug-in that implements the `InstrumentModel` protocol (`model.py`):

- `domain`, `display_name`, `simulated`
- `hypotheses` (`Hypothesis(id, label, spoken, description)`), `sites` (`Site(index, label, spoken)`), `reading` (`ReadingSpec(unit, min, max, decimals)`)
- `default_sigma`, `default_class_tolerance`
- `expected_readings()` returns an F x K matrix (F hypotheses, K sites)
- `expected_reading()`, `hypothesis_index()`
- phrase hooks: `instruction_phrase()`, `warning_phrase()`, `diagnosis_phrase()`, `unresolved_phrase()`

Core pieces:

| Module | Responsibility |
|---|---|
| `config.py` | named constants and `EngineConfig`: sigma, confusion, thresholds, quadrature points, max steps |
| `confusion.py` | `banded_confusion(spec, n)`: told n, land l; clipped and renormalised at the edges (row 1: 0.876 / 0.090 / 0.034) |
| `engine.py` | log-space update, placement posterior, retrospective `placement_audit`, expected gain, instruction choice, resolution rule, distinguishability classes |
| `session.py` | `Session(model, engine, mode, seed, true_hypothesis, fixture, reveal)`: `step(reading or None)`, `reset()`, `view(include_truth)` |
| `baselines.py` | `entropy_exact` (the published method, live in the engine), `checklist`, `random`, `remeasure_until_agree`. Sessions run `entropy_exact` in shadow mode |
| `domains/` | registry `{circuit, thermometer}`; `circuit.py` (netlist, solver, catalog); `thermometer.py` (series solution) |
| `record_fixtures.py` | writes the nine fixtures through `Session` only |
| `experiments/` | `experiment.py`, `stability.py`, `mismatch.py`, `sweep.py`, `mkfigs.py` (section 14) |

Math (from `.claude/rules/00-truehand.md`): `P(r | f, n) = sum_l P(l | n) N(r; V_f(l), sigma)`; `b'(f) proportional to b(f) P(r | f, n)`; `n* = argmax_n [H(b) - E_r H(b' | r)]`; warn when `P(l != n | r) > 0.5`.

Constants (`config.py`, values from plan A2):

| Name | Value | Name | Value |
|---|---|---|---|
| `SIGMA_VOLTS` | 0.02 | `PLACEMENT_WARNING_THRESHOLD` | 0.5 |
| `CONFUSION` | P(same) 0.78, P(plus or minus 1) 0.08 each, P(plus or minus 2) 0.03 each (assumed; measured later) | `RESOLVE_THRESHOLD` | 0.95 |
| `MIN_USEFUL_GAIN_BITS` | 1e-3 | `CLASS_TOLERANCE_VOLTS` | 1e-3 |
| `MAX_STEPS` | 12 | `GH_QUADRATURE_POINTS` | 20 |
| `OUT_OF_MODEL_SIGMAS` | 5.0 | `MIN_SIGMA` | 1e-6 (smallest sigma the API accepts) |

### Why Gauss-Hermite and not Monte Carlo

Expected information gain integrates over the reading r. We use 20-point Gauss-Hermite quadrature. Reasons: it is deterministic, so the TypeScript port needs no RNG parity; the nodes and weights are written into every fixture (`config.quadrature`), so both languages use the same numbers; and 20 points is cheap enough for a per-step choice over six sites. Monte Carlo would need a seed and a parity story for every sample, and we would have no way to check it against a fixture. Tests check that the gain is never below -1e-9 and that an unchanged belief gives zero delta gain (plan A7).

Resolution order and thresholds: `docs/API_CONTRACT.md` section 7 (invariant 9). The refusal path (`unresolved`, reason `indistinguishable`) is the honesty feature, not an error. The published method (`entropy_exact`) runs on the same readings in shadow mode, so the comparison uses identical inputs; checklist, random, and remeasure-until-agree exist only for experiments.

### Misfit refusal

A reading can be impossible under every hypothesis: a bridged probe reads between two rows, a poor contact reads near 0 V. The engine measures how far the reading sits from the nearest predicted reading at the sites the hand could reach, in sigma. Beyond `OUT_OF_MODEL_SIGMAS` (5.0), the step is out of model. The belief is not updated, the placement falls back to the landing prior, the warning stays off, and the user is asked to measure the same site again. The step still counts toward `MAX_STEPS`. The response shape is `misfit` (API_CONTRACT section 3.6, invariant 11). `MIN_SIGMA` (1e-6) is the smallest sigma the API accepts. The mismatch run records 7 out-of-model readings for bridging and 0 for poor contact (`docs/results/mismatch_2026-10-25.md`). A 0 V reading is never out of model, because for every told row some hypothesis predicts about 0 V at a reachable row (`R3_short` puts row 3 at ground for told rows 1 and 2; `R1_open` predicts 0 V at row 5 for told rows 3 to 6).

## 5. Domains

### 5.1 Circuit (exact, simulated by our own solver)

GND is the battery negative rail, not a site. Sites are rows 1 to 6 (indices 0 to 5).

| Element | Connection | Value |
|---|---|---|
| BAT | row 1 to GND | 9.0 V |
| R1 | row 1 to row 2 | 1 k |
| R2 | row 2 to row 3 | 2.2 k |
| R3 | row 3 to GND | 2.2 k |
| R4 | row 3 to row 6 | 4.7 k |
| R5 | row 6 to GND | 4.7 k |
| R6 | row 2 to row 4 | 330 |
| D1 (LED) | anode row 4, cathode row 5 | PWL, Vf0 2.0 V, Rs 20 ohm |
| R7 | row 5 to GND | 100 |

Nominal node voltages (rows 1 to 6): 9.000, 3.871, 1.733, 2.499, 0.416, 0.866 V. Scratch MNA residual: max 0.359 mV. Branch currents: LED 4.157 mA, divider 0.972 mA, R1 5.129 mA. The LED parameters were chosen because (1.8 V, 68 ohm) flips the worked example's first-step top candidate, which contradicts the brief.

Catalog scheme: `nominal`; `R{1..7}_{open, short, 10x_high, 10x_low}` (open 1e9 ohm, short 1e-3 ohm); `LED_open`, `LED_short` (1e6 S), `LED_reversed` (no element); `battery_low` (7.2 V). Total 1 + 28 + 3 + 1 = 33 hypotheses.

Distinguishability at tolerance 1e-3 V: 33 hypotheses form **32 classes**, the engine's own result (`engine/tests/test_circuit.py::test_class_count_is_what_the_solver_computes`). The only multi-member class is {`LED_open`, `LED_reversed`}. The near pair is `R7_short` against `R7_10x_low` (45 mV apart, at row 5 only; `test_r7_short_and_r7_10x_low_differ_only_at_row_five` asserts the separation is above 1 mV). The brief and the rules file say 31; we report 32.

Worked example (recorded in `engine/fixtures/parity/worked_example.json`, git_sha d4731fc; confusion 0.78/0.08/0.03, sigma 0.02 V, uniform prior, 5.044 bits): true `R3_10x_low`, told row 3, lands row 2, reads 3.671 V. Top candidate `R3_short` 0.631, `R3_10x_low` 0.345, placement [0, 1, 0, 0, 0, 0] (to 1e-6), P(off) 1.0, so the warning fires. Published method: `R2_short` 1.000 (wrong). At 0.338 V told row 3, `R3_10x_low` 0.975, resolved. The brief said 63.5% and 97.6%; the recorded values are 63.1% and 97.5%, and the brief's numbers are expectations, not our claim.

### 5.2 Thermometer (simulated, labeled SIMULATED everywhere)

A kitchen probe thermometer reading a sphere of radius 6 cm cooked in a 120 C oven. Transient conduction is computed from the exact series solution (Incropera et al., ch. 5). Parameters (A3): radius 0.06 m; alpha 1.3e-7 m^2/s; k 0.48 W/m K; h 12 W/m^2 K; Biot 1.5 (= h R / k, checked: 12 x 0.06 / 0.48 = 1.5); T-inf 120 C; initial 5 C; sigma 0.5 C; 30 roots of 1 - zeta cot zeta = Bi by bisection.

Six depth sites: 0.5, 1.5, 2.5, 3.5, 4.5, 5.5 cm. Seven doneness classes (center temperature): cold_center 40, rare 50, medium_rare 55, medium 60, medium_well 65, well_done 70, overdone 75 C. The `medium` class note cites the USDA 62.8 C guidance. Sources: Incropera et al. ch. 5; ASHRAE Refrigeration, "Thermal Properties of Foods".

Minimum adjacent-class separation per site, from the engine's expected readings (an engine check, not pinned by a test): [2.96, 3.57, 4.11, 4.53, 4.83, 4.98] C. Demo (`engine/fixtures/parity/thermometer_demo.json`, SIMULATED): true `medium`, told 5.5 cm, lands 3.5 cm, reads 65.65 C. Step 1 gives `medium_well` 0.947 with P(off site) 0.059 from the engine, so no warning fires. Next instruction is the surface.

Honest finding: a 2 cm slip is not detectable from one reading, because the profiles are shift-invariant. The engine recovers at step 2, and the retrospective audit then says "your first reading came from about 3.5 cm". The landing copy and video shot 7 tell that story. We do not fake a first-step warning.

## 6. API

Routes, schemas, error codes, CORS, fixture shape, and parity tolerances: `docs/API_CONTRACT.md`. Web mapping from API fields to store fields: `docs/API_CONTRACT.md` section 11. Engine names are the contract (plan reconciliation 1): `landed_site`, `p_off_site`, `likely_site`, `unresolved.classes`.

## 7. State model v1 (`apps/web/src/state/types.ts`)

Frozen at bootstrap. Changes after freeze go through the integration lane.

```ts
type DomainId = 'circuit' | 'thermometer'
type Mode = 'simulate' | 'live' | 'replay'
type EngineSource = 'api' | 'replay' | 'local'
type Phase = 'idle' | 'starting' | 'awaiting_reading' | 'submitting' | 'revealing'
           | 'resolved' | 'unresolved' | 'error'
type Site = number                       // 0-based engine index; label from DomainSpec.sites[i]

interface DomainSpec {
  id: DomainId; title: string; simulated: boolean; siteNoun: string
  unit: string; unitSpoken: string; readingDecimals: number; readingRange: [number, number]
  sites: SiteSpec[]; phrases: { instruction: string; accepted: string; warning: string; diagnosis: string; unresolved: string }
}
interface Warning { toldSite: Site; likelySite: Site; pOffSite: number; text: string }   // null when active is false
interface ReadingEntry {
  step: number; toldSite: Site; value: number; source: 'typed' | 'voice' | 'simulated' | 'replay'
  landedSite?: Site; placement: number[]; warning: Warning | null; entropyBits: number
  top: { hypothesisId: string; mass: number }; acceptedAt: number
}
interface Reveal { landedSite: Site; token: string; next: 'awaiting_reading' | 'resolved' | 'unresolved' }
interface SessionError {
  code: 'api_unreachable' | 'api_waking' | 'api_error' | 'bad_reading' | 'not_next_in_replay'
      | 'fixture_missing' | 'session_lost' | 'webgl_lost'
  sentence: string; canRetry: boolean; resumePhase: Phase
}
interface SessionState {
  domain: DomainId; mode: Mode; engineSource: EngineSource; sessionId: string | null
  phase: Phase
  instruction: { site: Site; label: string; spoken: string } | null
  aimedSite: Site | null
  readings: ReadingEntry[]
  belief: number[]; entropyBits: number; maxEntropyBits: number   // max = log2(hypothesis count), proposed
  placement: number[]; warning: Warning | null
  diagnosis: { hypothesisId: string; label: string; confidence: number; spoken: string } | null
  unresolved: string[] | null
  baseline: { belief: number[]; diagnosis: Diagnosis | null }
  catalog: CatalogView | null; reveal: Reveal | null
  error: SessionError | null; apiHealth: 'ok' | 'waking' | 'down' | 'unknown'
  // actions
  start(opts): Promise<void>; aimProbe(site: Site): void; submitReading(value: number, source: ReadingEntry['source']): Promise<void>
  finishReveal(token: string): void; replayNext(): void; replayPlay(paceMs?: number): void; replayPause(): void
  retry(): void; reset(): void; setApiHealth(h: SessionState['apiHealth']): void
}
```

Transitions:

| From | Event | To | Notes |
|---|---|---|---|
| idle | `start()` | starting | chooses a client (below) |
| starting | session ready | awaiting_reading | instruction set |
| awaiting_reading | `submitReading()` | submitting | non-numeric or out-of-range input: error `bad_reading` |
| submitting | response has `landed_site`, scene can animate | revealing | probe travels, then `finishReveal` |
| submitting | response, no animation needed | `reveal.next` | same as finishReveal with no travel |
| revealing | `finishReveal(token)` | `reveal.next` | stale token ignored; `landedSite` written here only |
| `reveal.next` | `awaiting_reading` / `resolved` / `unresolved` | same | from `status` |
| any | network, fixture, or WebGL failure | error | `resumePhase` set |
| error | `retry()` | `resumePhase` | only when `canRetry` |
| any | `reset()` | idle | |

Client selection (`chooseClient(mode, localParity, apiHealth)`):

| Mode | Local parity passed | API health | Client |
|---|---|---|---|
| replay | any | any | `ReplayClient` (no network) |
| simulate or live | yes (Sprint 3) | any | `LocalClient` (TS port) |
| simulate or live | no | ok or unknown | `ApiClient` |
| simulate or live | no | waking or down | `ReplayClient` with the `api_waking` sentence ("engine is waking up") |

`EngineClient` interface: `ApiClient | ReplayClient | LocalClient`. `ReplayClient` validates the fixture with Zod before use.

## 8. Scene

One `<Canvas>` mounted at app level, `sceneMode: landing | sim | hidden`. The camera flies from the landing pose to the sim pose (`CameraRig.tsx`, lerp in `useFrame`, `invalidate()` only within 300 ms of a scroll). Lazy loaded. Open conflict: B6 says three and r3f are not loaded on `/`, but B1 mounts the landing pose in the same Canvas; the size-limit rule follows whichever is decided.

Camera: fov 35, near 0.01, far 5, position [0.18, 0.22, 0.28] m. DPR [1, 1.75]. `frameloop="demand"`, with a ref-counted `useAnimating()` that keeps the loop running during motion. One shadow-casting key light (1024 shadow map), custom light rig, no CDN HDR, no postprocessing. Glow is emissive plus one additive halo quad.

Draw-call budget (from B5 items; the total is measured, not assumed):

| Item | Calls | Item | Calls |
|---|---|---|---|
| slab | 2 | ContactShadows | 2 |
| holes (Instances) | 1 | components | 7 |
| highlight (Instances) | 1 | merged wires | 1 |
| told outline | 1 | probe | 3 |
| black leads | 2 | plumb line | 3 |
| belief fan | 1 | **itemized sum, circuit** | **24** |
| roast scene (hidden in circuit) | about 12 | plan target / hard budget | about 27 / 150 |

The itemized sum (24) does not match the plan's target (about 27). The scene lane records the measured `renderer.info.render.calls` in its PR, and that measured number replaces this table.

Scene behaviours:
- Probe tremor: sum of sines at 1.3 Hz and 2.1 Hz, seeded. Amplitude 0.6 mm x (1 - p_same) / (1 - 0.78), where p_same = P(l = n | n) from the confusion prior (not the placement posterior, which describes the last reading). So it is 0.6 mm under the assumed model, grows if a measured hand is less accurate, and is 0 when p_same = 1. Drawn only in the circuit while awaiting a reading and above about one pixel; reduced motion shows a static +/-2 bracket instead. (Revised 2026-10-25 in the scene review.)
- Reveal: arc path with an 8 mm lift, `springs.gentle`, contact dip 1.5 mm, then `finishReveal(token)`.
- Told row: cyan outline. Landed row: amber fill only after reveal.
- Belief overlay: strip emissive intensity = colorScale(placement[i]) times `sceneGlowMax` (1.6). A warning turns the told outline vermilion.
- Plumb line: pivot 60 mm up; amplitude = entropyBits / maxEntropyBits mapped to [0, 18 degrees]; `springs.release`; rests over the diagnosed component. When unresolved, it alternates between two candidates every 3 s.
- Hitboxes are `visible={false}` (the raycaster ignores visibility; a test pins this).
- Labels are drei `<Html>` with `aria-hidden`. The Canvas wrapper has `role="img"` and a text label.
- Reduced motion: every animation snaps. An unresolved pair shows a static bracket of plus or minus 2 rows.
- OrbitControls in sim only (no pan, clamped); disabled on the landing page.

Nothing informational lives only in the 3D scene. Every state has a DOM and spoken twin (section 10).

## 9. Landing choreography

The landing page is DOM-driven. `useScrollProgress` (passive listener, rAF) writes `progress` and `section` to `state/landing.ts`. `choreography.ts` exports pure `poseAt(progress): ScenePose`, unit-tested at its keyframes. We do not use drei `ScrollControls`, because it hijacks document scroll and breaks screen readers.

| # | Section | Job | Static twin |
|---|---|---|---|
| 0 | mast | one sentence; two exits (play the 20 s example, open the simulator); pendulum swings at max entropy | heading and buttons |
| 1 | problem | probe trembles over row 3, bracket over rows 1 to 5 (plus or minus 2); pull quotes with sources | quotes in DOM |
| 2 | play | sticky split, scene left, Truehand against published method right; Play runs the fixture through the real store in replay | always-present `<ol>` transcript of six steps |
| 3 | how | top-down camera; six math lines light as their meaning animates | the six lines as text |
| 4 | generalize | crossfade to roast cross-section; told 25 mm, lands 15 mm (fat); SIMULATED badge in DOM and in scene | caption and badge |
| 5 | ladder | plumb line fades into a DOM vertical rule that becomes the ladder rail | `<table>` of four stages |
| 6 | evidence | readiness table: built items 100 percent; blind-user validation PENDING with date and plan | EvidenceTable |
| 7 | close | "It cannot tell you something it has not measured." plus exits | text |

Captions never go to a live region. Play never autoplays on scroll. Reduced motion snaps to the section keyframe (IntersectionObserver) and shows the stepper.

## 10. Accessibility

- **Live regions.** Two regions, polite and assertive, in `LiveRegion.tsx`. `announce(text, {priority, dedupeMs = 1500, force})` queues messages. Polite messages drain one per 700 ms. An assertive message clears the polite queue.
- **One mirror.** `a11y/announcer.ts` is the only store subscriber that writes to the live regions. Nothing else announces.
- **Event mapping.** Instruction (polite), accepted (polite), warning (assertive), likely row (polite), diagnosis or refusal (polite), blocking error (assertive).
- **Focus.** Route change: focus `h1`. `awaiting_reading`: reading input. Warning: `WarningBanner` (`role="alert"`). Resolved: `DiagnosisCard`. Unresolved: refusal sentence. Error: the error sentence.
- **Text channel.** A first-class view (`view=text`). Every scene state has a text equivalent. Typed input is always visible.
- **Speech** is off by default. The `V` key toggles it. Live regions are always on.

Keyboard map (guarded: ignored when the target is editable or a modifier is held; every shortcut is also a button with `aria-keyshortcuts`):

| Key | Action | Key | Action |
|---|---|---|---|
| `1` to `9` | aim at row n (site n - 1) | `V` | toggle speech |
| `Enter` | submit the reading | `R` | repeat the instruction |
| `T` | focus typed input | `L` | toggle reading log |
| `M` | toggle microphone (not Space) | `P` | play or pause replay |
| `[` / `]` | previous or next replay step | `?` | keyboard map dialog |
| `Esc` | close dialogs, cancel listening | | |

Skip links are in `SkipLinks.tsx`. Focus rings are double (`--focus` plus `--focus-gap`, section 12).

iOS notes: Speech synthesis needs a `unlock()` call inside the first user gesture. Utterances are chunked under 200 characters. Speech is cancelled before any assertive message. Safari speech recognition is unreliable in a standalone PWA, so the typed input is always visible on iOS. The VoiceOver pass is part of the a11y audit (Sprint 2, and again after the Capacitor build).

## 11. Voice loop (`apps/web/src/voice/`)

- `voiceMachine.ts`: pure reducer. States: `off`, `idle`, `speaking`, `listening`, `parsing`, `confirming`, `submitting`. It emits effects: `speak`, `listen`, `submit`, `focusTyped`, `announce`.
- Confirmation happens only when recognition alternatives disagree.
- `parseReading.ts`: table-driven, 30 or more rows, covers spoken numbers and units.
- `phrases.ts` is shared with `announcer.ts`, so spoken and displayed text never drift.
- `listen.ts` is an adapter interface: `adapters/web.ts` now, `adapters/capacitor.ts` for the iOS build.
- `stubs/fakeRecognition.ts` drives the Playwright voice spec. The channel never submits outside the state machine; transcripts are data, never evaluated.

## 12. Design tokens

Source: `styles/tokens.json`, generated to `styles/tokens.css` by `scripts/build-tokens.mjs`. Tailwind v4 maps the variables with `@theme inline` (check the exact syntax with ctx7 at bootstrap). Fonts: IBM Plex Sans 400, 500, 600 and JetBrains Mono Variable, self-hosted through fontsource.

Light theme is the default (see docs/POSITIONING.md section 4 for the light values). Dark theme values from B2:

| Token | Value | Use |
|---|---|---|
| `--bench` | `#0B0D10` | page background |
| `--surface-1` / `-2` / `-raised` | `#14171C` / `#1C2026` / `#23272E` | panels |
| `--hairline` | `#2A2F37` | decorative only |
| `--border-strong` | `#687180` | control boundaries |
| `--text` / `--text-2` / `--text-muted` | `#ECE9E2` / `#A9A49A` / `#8F8B83` | text |
| `--measured` | `#F2A93B` | measured values (amber, filled, labeled) |
| `--inferred` | `#5FD3E8` | inferred values (cyan, outlined) |
| `--warning` / `--warning-text` | `#FF5A36` / `#FF8A6A` | warning (vermilion, left rule, glyph, word) |
| `--baseline` | `#A9A49A` | published method |
| `--on-measured`, `--on-inferred`, `--on-warning` | `#0B0D10` | text on fills |
| `--focus` / `--focus-gap` | `#FFD36B` / `var(--bench)` | double focus ring |
| `--scene-bg` / `--scene-hole` / `--scene-board` | `var(--bench)` / `#05060A` / `var(--surface-raised)` | scene |
| `--scene-glow-max` | 1.6 | belief glow ceiling |

Light: bench `#F6F3EC`, text `#15181C`, measured text `#8A5200` with fill `#F2A93B`, inferred text `#0B6478` with fill `#5FD3E8`, warning `#B02C17`, focus `#0B6478`.
High contrast: pure black and white, measured `#FFC857`, inferred `#7FE7FF`, warning `#FF7A5C`, focus `#FFFF00`, all motion 0 ms.

Contrast values (design agent's computation in B2, not yet reproduced by a script): text on bench 16.05, text-muted 5.73, measured as text 9.74, inferred 11.09, warning text 8.43, border-strong 3.95, focus 13.7. The check that counts is axe in Playwright, zero serious or critical in all three themes.

Accents are never the only cue: measured = amber + filled + label; inferred = cyan + outlined; warning = vermilion + left rule + glyph + word.

Theme mechanism: `<html data-theme="dark" | "light" | "hc">`. When absent, the theme follows the OS (`prefers-color-scheme`, `prefers-contrast`, `forced-colors`). An inline pre-script reads `localStorage["truehand.theme"]` before first paint. `scene/tokens.ts` reads tokens with `getComputedStyle` and a MutationObserver, so the 3D scene follows the theme.

Motion: instant 80, fast 180, normal 350, slow 600, crawl 1000 ms; easing `cubic-bezier(.22, 1, .36, 1)`. Radius: hard 2 px, soft 10 px.

## 13. Fixtures and parity

- Nine fixtures in `engine/fixtures/parity/`: `worked_example`, `seed_1` to `seed_5`, `slip_heavy`, `unresolved_pair` (true `LED_reversed`), `thermometer_demo`. Content and shape: `docs/API_CONTRACT.md` section 8.
- Vitest reads them through a Vite alias, `@fixtures`, which points at `engine/fixtures/parity`. No copy, no drift. Pytest reads the same files.
- Public build: the static site must serve the JSON at runtime. The plan's B3 lists `scripts/sync-fixtures.mjs` copying into `public/fixtures/`, but reconciliation 3 says alias, not copy. This is open; settle it at bootstrap and record the decision in `docs/decisions/`.
- Provisional fixture retired (main 9a997a5): the hand-typed `apps/web/src/fixtures/provisional/worked_example.json` is gone. Web replay loads only the recorded fixtures (`loadFixture` in `apps/web/src/state/replay.ts`); an unknown id fails with `fixture_missing`. The PROVISIONAL badge in `SimPage` remains for any fixture without provenance, but no shipped fixture is provisional now. The generator field is `generated_by` (A5 name; B3's `recorded_by` is not used).
- Tolerances: belief, placement, audit, expected gain, and entropy within 1e-6 absolute; `engine_choice.site`, `status`, and `warning` exact; circuit voltages within 1e-3 V (pytest).
- Parity gate: the TS port drives replay or simulate only after parity passes on all nine fixtures (ADR 0006).

## 14. Experiments and evidence

Scripts (plan A6). Every run writes `docs/results/<name>_<date>.{md,json}` with the command, git SHA, and seeds.

| Script | Purpose |
|---|---|
| `experiments/experiment.py N [--seed] [--domain]` | arms: truehand, entropy_exact, checklist, random, remeasure_until_agree; metrics: correct, confidently wrong (at least 0.9 on a wrong class), unresolved rate, mean steps, warnings issued and correct |
| `experiments/stability.py` | seeds 1 to 5, mean and standard deviation |
| `experiments/mismatch.py` | lopsided slips (0.78 same, 0.14 down, 0.02 up); 3-row jumps (p = 0.03); bridging (p = 0.10, reading = midpoint, stated simplification); poor contact (p = 0.05, reads 0 V) |
| `experiments/sweep.py` | p_same from 0.60 to 1.00, matched and fixed-model panels |
| `experiments/mkfigs.py` | SVG figures into `docs/results/figures/` |

Reproduce: `uv run --project engine python -m truehand.experiments.experiment 400`. Figures: fig1 arm bars; fig2 sweep; fig3 worked-example trajectories; fig4 warning precision and recall; fig5 thermometer profiles (labeled simulated roast); fig6 distinguishability heatmap.

Numbers rule: the brief's expectations (99.0 percent correct for Truehand, 21 times fewer confident errors) are expectations, not claims. A number appears in the UI only after `experiment.py` or `stability.py` has written it to `docs/results/`.

## 15. PWA and iOS path

- PWA via `vite-plugin-pwa`, `registerType: 'prompt'`. Precache js, css, html, woff2, svg, png, json. `navigateFallback: /index.html`. `maximumFileSizeToCacheInBytes` 3 MiB. Offline replay is a Sprint 3 acceptance item.
- Manifest: `start_url` `/sim?mode=replay`, theme `#0B0D10`, icons 192, 512 (maskable), apple-touch 180.
- iOS: Capacitor wrapper at finals week (ADR 0009), a 7-day plan in `apps/ios`: D1 init and iOS project; D2 speech adapter and permission strings; D3 VoiceOver pass; D4 TestFlight; D5 blind tester session (pending until it happens); D6 fixes; D7 native recording. No native rewrite.

## 16. Deployment on Render

Two services, defined in `render.yaml` (ADR 0005).

| Service | Type | Build and run | Notes |
|---|---|---|---|
| `plumbline-web` | static site | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter web build`; publish `apps/web/dist`; rewrite `/*` to `/index.html`; Node 20.20.0 | `sw.js` no-cache; assets immutable; `Permissions-Policy: microphone=(self)` |
| `plumbline-api` | web service, Python | `rootDir: engine`; build `pip install uv && uv sync --frozen --no-dev`; start `uv run --no-sync uvicorn truehand_api.main:app --host 0.0.0.0 --port $PORT`; `PYTHON_VERSION` 3.13.x | health check `/v1/health`; env `TRUEHAND_CORS_ORIGINS`, `TRUEHAND_FIXTURES_DIR` |

Fallback container: `FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim`. The health path is `/v1/health` (plan reconciliation 4; the B6 draft said `/health`, which is superseded).

Plan tiers: free while building; Starter for the semifinal review window (reconciliation 4) and through finals. The plan's Sprint 5 row switches it on at Dec 7. These two dates disagree; fix one at Sprint 2 planning.

Asleep API: the free tier sleeps after 15 minutes idle. The plan estimates a 30 to 60 s cold start; that is an estimate and must be measured on the deployed service and recorded. The web app probes `/v1/health` with a 4 s timeout and gets `ok`, `waking`, or `down`. If not `ok`, it shows the waking sentence, uses replay, and polls every 5 s for up to 90 s. Replay never needs the API. An optional GitHub Actions health ping keeps the service warm (plan A8).

## 17. Parallel lanes and write surfaces (Sprint 1)

Each lane is one worktree and one write surface. Shared files (`package.json`, `vite.config.ts`, `tokens.css`, `state/types.ts`) change only on `main` or in the integration lane.

| Lane | Owner agent | Write surface |
|---|---|---|
| engine | engine-scientist (tdd) | `engine/**` |
| web-shell | ui-designer + tdd-guide | `apps/web/src/{ui,a11y,sim,evidence,about}/**`, `App.tsx`, `styles/**` |
| scene | three-engineer | `apps/web/src/scene/**` |
| landing | ui-designer + three-engineer | `apps/web/src/landing/**`, `public/transcripts/**` |
| voice | tdd-guide + a11y-auditor | `apps/web/src/voice/**` |
| e2e | e2e-runner | `apps/web/e2e/**`, `playwright.config.ts` |
| integration (day 6, `main`) | this session | shared files; merge order engine, shell, scene, landing, voice, e2e |

Sprint 0 freezes the shared contracts (`state/types.ts`, `engine/client.ts` with `ReplayClient`, `state/landing.ts`, `styles/tokens.css`, `a11y/liveRegion.ts` stub, `render.yaml`) before any lane starts.

## 18. Decisions log

ADRs 0001 to 0011 live in `docs/decisions/`, index in `docs/decisions/README.md`. This file does not repeat them; when an ADR changes, update the section it affects here in the same PR.
