# Truehand API contract v1

Status: v1, 2026-10-25. Matches `engine/plumbline_api/` on main at 9a997a5. Owner: this file. When it disagrees with `engine/plumbline_api/schemas.py`, schemas.py wins and this file is fixed in the same PR (see section 12).

Origin: approved plan, Appendix A4 (schemas), A5 (fixture shape), A8 (deploy health check), and reconciliations 1 and 4. The engine lane's divergences from the first draft are recorded in `docs/lanes/sprint1-engine.md` section 1 and are all reflected here.

## 1. Base path and conventions

- Base path `/v1`. Every route below is relative to it, for example `POST /v1/sessions`. Local origin: `http://localhost:8000`.
- JSON in, JSON out. Pydantic v2 models. Request models use `extra="forbid"`, so unknown fields return 422.
- `Finite` means no inf and no nan. `Prob` means a float in [0, 1].
- Sites are 0-based integer indices. Each carries a `label` (UI text, 1-based, for example "row 3") and a `spoken` form. Arrays are 0-based, labels are 1-based.
- `belief[i]` corresponds to `catalog.hypotheses[i]`. The same order is used everywhere in a session.
- Session ids are server-generated lowercase UUID4 strings. A path id that is not a lowercase UUID4 is a 422 `validation_error`, not a 404.
- Optional response fields are always present as keys and are `null` when empty (for example `instruction` after a terminal step, `landed_site` when hidden).
- Interactive API docs are served at `/v1/docs` and the schema at `/v1/openapi.json`.

## 2. Endpoints

| Method | Path | Request body | Success response | Notes |
|---|---|---|---|---|
| GET | `/v1/health` | none | `{status: "ok", version}` | Render `healthCheckPath`. `version` is the package version (`0.1.0` at this commit) |
| GET | `/v1/domains` | none | `{domains: [{id, display_name, simulated}]}` | ids: `circuit`, `thermometer` |
| GET | `/v1/domains/{domain}/catalog` | none; optional query `include_expected_readings=true` | `CatalogView` | unknown domain: 422 `unknown_domain`. `expected_readings` is `null` unless the flag is set |
| POST | `/v1/sessions` | `CreateSession` | `SessionView`, status 201 | creates an in-memory session |
| GET | `/v1/sessions/{id}` | none | `SessionView` | unknown, expired, or evicted: 404 `session_not_found`; malformed id: 422 |
| POST | `/v1/sessions/{id}/step` | `StepRequest` (body may be `{}` or absent) | `StepView` | behaviour per mode, section 4 |
| POST | `/v1/sessions/{id}/reset` | none | `SessionView` | same config and truth, step count back to 0 |

Only these seven routes exist in v1, plus the two documentation routes in section 1. The v0 names are superseded and must not come back (section 12).

## 3. Schemas

Field tables. "Required" follows the plan's A4 notation: a field without `?` is required.

### 3.1 CreateSession (request)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `domain` | string | yes | at most 64 characters; a value not in the registry is 422 `unknown_domain` (`details.field` = `domain`) |
| `mode` | enum | yes | `simulate`, `live`, `replay` |
| `seed` | int | yes | strict int, 0 to 2^32 - 1; drives the seeded hand in simulate |
| `reveal` | enum | yes | `after_step` or `never` |
| `true_hypothesis` | string | no | simulate only; in other modes 422 `validation_error` with `details.field` = `true_hypothesis`. Must be a catalog id, else 422 `unknown_hypothesis`. If absent in simulate, the server draws it from the prior with `seed` |
| `fixture` | string | no | regex `^[a-z0-9_]{1,40}$`; required in replay and rejected in other modes (422 `validation_error`, `details.field` = `fixture`). Missing file: 404 `fixture_not_found` |
| `sigma` | float | no | finite, in [1e-6 (`MIN_SIGMA`), 100]; default is the domain default. Rejected in replay (`details.field` = `sigma`) because replay uses the fixture's own config |
| `confusion` | object | no | `{p_same, p_pm1, p_pm2}`, each Prob, with `p_same + 2 p_pm1 + 2 p_pm2 = 1` within 1e-6 (symmetric band, `confusion.py`). Rejected in replay |

Mode rules, all 422 `validation_error`: replay without `fixture`; `fixture`, `true_hypothesis`, `sigma` or `confusion` in a mode that does not accept them. A replay fixture from another domain is 409 `fixture_mismatch` (`details.field` = `domain`).

### 3.2 StepRequest (request)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `reading` | float | depends on mode (section 4) | Finite; checked against the domain `ReadingSpec` range, else 422 `reading_out_of_range` |

The request body may be `{}`, empty, or absent. Any other key is a 422 `validation_error`.

### 3.3 CatalogView (response)

| Field | Type | Notes |
|---|---|---|
| `domain` | string | |
| `simulated` | bool | true for the thermometer; the UI must badge it SIMULATED |
| `reading_unit` | string | `V` for circuit, `C` for thermometer (degrees Celsius; set in the domain module) |
| `sigma` | float | Finite, > 0 |
| `hypotheses` | list, max 64 | each `{id, label, spoken, description}` |
| `sites` | list, max 16 | each `{index, label, spoken}` |
| `classes` | list of lists of ids, max 64 | distinguishability classes at the domain's class tolerance; a class with more than one member is indistinguishable |
| `expected_readings` | `null`, or F x K floats | returned only with `include_expected_readings=true` |

### 3.4 SessionView (response)

| Field | Type | Notes |
|---|---|---|
| `session_id` | string | |
| `domain`, `mode` | string | |
| `simulated` | bool | |
| `reveal` | enum | echoes the request |
| `status` | enum | `continue`, `resolved`, `unresolved` |
| `config` | ConfigView | `{sigma, confusion (K x K), thresholds}` |
| `catalog` | CatalogView | |
| `instruction` | InstructionView or `null` | `null` when the session is terminal |
| `belief` | float list | length = hypotheses, Finite, sums to 1 |
| `entropy_bits` | float | Finite, >= 0 |
| `steps` | list of StepView, max 32 | |
| `true_hypothesis` | string or `null` | invariant 7 |

`ConfigView.thresholds` is `{resolve, placement_warning, min_gain_bits, class_tolerance, max_steps, out_of_model_sigmas}`. The defaults are 0.95, 0.5, 1e-3, 1e-3 (domain default), 12 and 5.0.

### 3.5 InstructionView

| Field | Type | Notes |
|---|---|---|
| `site` | int | 0-based index |
| `label`, `spoken` | string | |
| `gain_bits` | float list | Finite; one expected information gain per site, in site order |

### 3.6 StepView (response)

| Field | Type | Notes |
|---|---|---|
| `step_index` | int | 0-based position of this step in the session |
| `instruction` | InstructionView | the site the user was told to probe for this step |
| `reading` | float | Finite; the value used for this step (echoed in live) |
| `unit` | string | |
| `landed_site` | int or `null` | invariant 6 |
| `placement` | PlacementView | |
| `placement_audit` | list of AuditView, max 32 | retrospective placement: one entry per step up to and including the current step, each re-asked under the current belief |
| `belief` | float list | |
| `entropy_bits` | float | |
| `status` | enum | `continue`, `resolved`, `unresolved` |
| `diagnosis` | DiagnosisView or `null` | present when `status` is `resolved` |
| `unresolved` | UnresolvedView or `null` | present when `status` is `unresolved` |
| `next_instruction` | InstructionView or `null` | `null` when terminal |
| `baseline` | BaselineView | shadow arm, same readings |
| `misfit` | MisfitView | additive in v1, always present (section 7, invariant 11) |

### 3.7 Nested views

| View | Fields |
|---|---|
| `PlacementView` | `probs` (length = sites, sums to 1), `warning` (WarningView) |
| `WarningView` | `active` (bool), `p_off_site` (Prob), `likely_site` (int), `text` (string). Always present. `active` is true when P(l != told \| r) > 0.5. `text` is `""` when inactive |
| `AuditView` | `step_index`, `probs` (length = sites) |
| `DiagnosisView` | `hypothesis_id`, `label`, `confidence` (Prob), `spoken` |
| `UnresolvedView` | `classes` (list of lists of ids), `reason` enum `indistinguishable` / `no_informative_site` / `max_steps`, `text`. For `indistinguishable` the list holds the one refused class. For the other two it holds the top classes in mass order until 0.95 of the mass is covered, at most 5 (`UNRESOLVED_MAX_CLASSES`) |
| `BaselineView` | `method` (`entropy_exact`), `shadow` (true), `belief`, `diagnosis` (DiagnosisView or `null`). The diagnosis is present when the published method's top class holds at least 0.95 of the mass |
| `MisfitView` | `active` (bool), `sigmas` (float, >= 0: distance to the nearest predicted reading, in sigma), `text` (string; `""` when inactive) |

`p_off_site` is defined as 1 - P(l = told | r), taken from the placement posterior.

## 4. The three modes of `POST /v1/sessions/{id}/step`

| Mode | Reading in request | Reading in response | `landed_site` in response | Truth known to server | Told site |
|---|---|---|---|---|---|
| simulate | must be absent. Present: 422 `reading_not_allowed` | computed as solver voltage plus sigma noise from the seeded hand | only when `reveal = after_step` and at least one step has run | yes, from `true_hypothesis` | the server's instruction |
| live | required. Missing: 422 `reading_required` | echoed from the request | never | no | the server's instruction, spoken by the app |
| replay | optional. If present it must match the fixture step within 1e-3 V (`REPLAY_READING_TOLERANCE`, same as the web ReplayClient rule), else 409 `fixture_mismatch` (`details.field` = `reading`) | from the fixture | only when `reveal = after_step` and at least one step has run | fixture truth | the server's instruction; a disagreement with the fixture's `told_site` is 409 `fixture_mismatch` |

Common rules for all modes:
- A step on a session whose status is `resolved` or `unresolved` returns 409 `session_terminal`.
- Replay never invents a step. A step past the end of the fixture returns 409 `fixture_mismatch` (`details.step_index`).
- A reading outside the domain range returns 422 `reading_out_of_range` in every mode that accepts a reading.

## 5. Errors

Envelope for every error response:

```json
{"error": {"code": "reading_out_of_range", "message": "One human sentence.", "details": {"field": "reading"}}}
```

`message` is one sentence for a developer or the UI. `details` names the field or id. Client text echoed in a message or in `details` is cut to 64 characters followed by `...`. Stack traces never leave the server; the server log carries the detail.

Validation failures carry `details: {errors: [{loc, msg, type}]}`. Mode-rule failures raised by the route carry `details: {field}`.

| HTTP | Code | When |
|---|---|---|
| 422 | `validation_error` | Pydantic failure: missing or extra field, wrong type, non-finite number, malformed session id, fixture name pattern, confusion sum, mode-rule violation, or a body that is not valid UTF-8 JSON (the body-could-not-be-read message is also 422, not 400) |
| 422 | `reading_required` | live step without `reading` |
| 422 | `reading_not_allowed` | simulate step with `reading` |
| 422 | `reading_out_of_range` | reading outside the domain `ReadingSpec` range |
| 422 | `unknown_hypothesis` | `true_hypothesis` not in the catalog |
| 422 | `unknown_domain` | domain id not in the registry |
| 422 | `numerically_degenerate` | the belief became non-finite. The sigma floor (`MIN_SIGMA`) makes this unreachable through the API today |
| 404 | `session_not_found` | id unknown, expired (TTL), or evicted (LRU) |
| 404 | `fixture_not_found` | fixture name not found in `PLUMBLINE_FIXTURES_DIR` |
| 404 | `not_found` | no route at that address |
| 405 | `method_not_allowed` | route exists, method does not |
| 409 | `session_terminal` | step on a resolved or unresolved session |
| 409 | `fixture_mismatch` | replay told site, reading, domain, or step count disagrees with the fixture |
| 413 | `payload_too_large` | request body over 16 KiB (`MAX_BODY_BYTES` = 16384; `details.max_bytes` gives the cap). Checked by Content-Length and by counting chunked bytes |
| 500 | `fixture_corrupt` | fixture fails to parse or validate on load |
| 500 | `internal_error` | any other unhandled failure. Message: "Something went wrong on the server." |

Any other HTTP status is returned with the code `http_error`; none is defined in v1.

## 6. CORS and settings

CORS is an allowlist. Only origins in `PLUMBLINE_CORS_ORIGINS` receive `Access-Control-Allow-Origin`. Allowed methods: `GET`, `POST`, `OPTIONS`. Allowed headers: `Content-Type`. Credentials: not allowed. Anything else gets no CORS header.

CORS headers are sent on every response for an allowed origin, including the 413 `payload_too_large` and the 500 `internal_error` replies. The request guard sits inside the CORS middleware to make that true.

Settings are read by `plumbline_api/settings.py` (pydantic-settings, prefix `PLUMBLINE_`).

| Env var | Settings field | Value / default | Meaning |
|---|---|---|---|
| `PLUMBLINE_CORS_ORIGINS` | `cors_origins` | comma-separated list. Unset: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`. `render.yaml` sets `https://plumbline-web.onrender.com,http://localhost:5173` | origin allowlist. Entries are trimmed. An empty entry or `*` makes the app refuse to start |
| `PLUMBLINE_SESSION_MAX` | `session_max` | 500 | LRU capacity of the in-memory store |
| `PLUMBLINE_SESSION_TTL_S` | `session_ttl_s` | 3600 | idle expiry in seconds |
| `PLUMBLINE_FIXTURES_DIR` | `fixtures_dir` | `engine/fixtures/parity` | where replay fixtures are read |

The request body cap (16 KiB) is a constant in `plumbline_api/guard.py`, not a setting.

Sessions live in memory only. A restart empties the store. There is no database.

## 7. Invariants

1. `belief[i]` corresponds to `catalog.hypotheses[i]`; belief is finite and sums to 1.
2. Sites are 0-based indices. Every site has a label and a spoken form, and the UI shows the label.
3. Every float in every response is finite. Every float in every request is finite (non-finite values are rejected at the boundary).
4. Every probability is in [0, 1]. Views clip at the boundary so rounding never reports 1.0000000002.
5. Bounded lists: hypotheses max 64, sites max 16, steps max 32, placement audit max 32. Reading range follows the domain `ReadingSpec`.
6. `landed_site` is non-null only in simulate or replay, only with `reveal = after_step`, and only after at least one step has run. It is always `null` in live. In `SessionView.steps` each earlier step repeats its own `landed_site` under the same rule.
7. `true_hypothesis` follows the same rule: `null` in live, `null` when `reveal = never`, and `null` before the first step (the truth is revealed after a step, not at creation or reset).
8. The placement warning is active exactly when P(l != told | r) > 0.5 (`PLACEMENT_WARNING_THRESHOLD`), and never on a misfit step (invariant 11).
9. Status is decided by the resolution rule below, evaluated after each update, in this order:

| Order | Condition (named constant) | Status |
|---|---|---|
| 1 | top class mass >= 0.95 (`RESOLVE_THRESHOLD`) and the class has one member | `resolved` |
| 2 | top class mass >= 0.95 and the class has more than one member | `unresolved`, reason `indistinguishable` |
| 3 | max expected gain < 1e-3 bits (`MIN_USEFUL_GAIN_BITS`) | `unresolved`, reason `no_informative_site` |
| 4 | steps >= 12 (`MAX_STEPS`) | `unresolved`, reason `max_steps` |
| 5 | otherwise | `continue` |

10. Determinism: the same seed and the same readings give the same response. A replay gives the same response every time from the same fixture.
11. Misfit (additive in v1, `OUT_OF_MODEL_SIGMAS` = 5.0). The distance of a reading from the nearest predicted reading `V_f(l)` over the sites the user could reach (`P(l | told) > 0`) is measured in sigma. When that distance is more than 5.0, the step is out of model:
    - belief is not updated, and the step's placement is the landing prior `P(l | told)`;
    - the warning is inactive, and `misfit.active` is true with the distance in `misfit.sigmas`;
    - the next instruction is the same site, and the status stays `continue` unless the step limit is reached (invariant 9 still applies to the step count);
    - `misfit.text` is a domain sentence that asks the user to check contact and measure the same site again (circuit: "Check that the probe is touching metal, then measure row N again.").

    No new status or reason was added. The reading still counts as a step.

## 8. Fixture JSON (A5) and parity

Fixtures live in `engine/fixtures/parity/*.json`. The recorder (`plumbline/record_fixtures.py`, flags `--only`, `--out`, `--force`) writes them through `Session` only, and refuses to overwrite an existing file without `--force`.

`schema_version` is 2. Every fixture records `generated_by` and `git_sha`. The version 2 fields are additive over the A5 shape: top level `source_mode`, `seed`, `simulated`; `config.quadrature` (20-point Gauss-Hermite nodes and weights), `config.domain_parameters` (the LED calibration for circuit, ADR-0002), `config.truth_confusion` (simulate-sourced fixtures only); `catalog.hypothesis_labels`, `catalog.site_labels`, `catalog.expected_readings`; per step `likely_site`, `unresolved` (always present, `null` unless unresolved), and `misfit`; threshold `out_of_model_sigmas`.

Shape (abbreviated; `worked_example.json` at git_sha `d4731fcec20e27998e4db258971a04b43da98a73` is the reference):

```json
{
  "schema_version": 2,
  "name": "worked_example",
  "domain": "circuit",
  "mode": "replay",
  "source_mode": "replay",
  "seed": 0,
  "simulated": false,
  "generated_by": "uv run --project engine python -m plumbline.record_fixtures --force",
  "git_sha": "d4731fcec20e27998e4db258971a04b43da98a73",
  "generated_at": "2026-10-25T17:20:15+00:00",
  "config": {
    "sigma": 0.02,
    "confusion": [["6 x 6 floats"]],
    "thresholds": {"resolve": 0.95, "placement_warning": 0.5, "min_gain_bits": 0.001, "class_tolerance": 0.001, "max_steps": 12, "out_of_model_sigmas": 5.0},
    "quadrature": {"x": ["20 floats"], "w": ["20 floats"]},
    "domain_parameters": {}
  },
  "catalog": {"hypothesis_ids": [], "hypothesis_labels": [], "site_labels": [], "expected_readings": [[]], "classes": [[]]},
  "true_hypothesis": "R3_10x_low",
  "prior_instruction": {"site": 2, "gain_bits": [0.585, 3.278, 3.511, 3.033, 2.692, 3.401]},
  "steps": [
    {
      "index": 0, "told_site": 2, "landed_site": 1, "reading": 3.671,
      "belief": [], "entropy_bits": 1.0995, "placement": [], "p_off_site": 0.99999972,
      "likely_site": 1, "warning": true, "placement_audit": [], "status": "continue",
      "engine_choice": {"site": 5, "gain_bits": []}, "next_told_site": 2,
      "baseline": {"method": "entropy_exact", "belief": [], "top": "R2_short", "confidence": 1.0},
      "diagnosis": null, "unresolved": null,
      "misfit": {"active": false, "sigmas": 0.72, "text": ""}
    }
  ]
}
```

Keys in `config.thresholds` are the same names the API returns in `ThresholdsView`. The fixture's `class_tolerance` key is the tolerance in the domain's unit (volts for circuit, degrees C for thermometer).

`next_told_site` is what the replay tells the user; `engine_choice` is what the engine would choose. They are recorded separately on purpose. The `engine_choice` gain list is per site, in site order.

Fixtures in v1:

| Name | Domain | Source | Content |
|---|---|---|---|
| `worked_example` | circuit | replay | true `R3_10x_low`, told row 3, lands row 2, 3.671 V then 0.338 V (the demo) |
| `seed_1` .. `seed_5` | circuit | simulate | seeded simulate runs for parity and stability |
| `slip_heavy` | circuit | simulate | run with frequent slips, for the warning path |
| `unresolved_pair` | circuit | simulate | true `LED_reversed`, indistinguishable from `LED_open` |
| `thermometer_demo` | thermometer | replay | true `medium`, told 5.5 cm, lands 3.5 cm, reads 65.65 C; SIMULATED |

Parity tolerances (checked by pytest recompute; the web parity test is planned in the web lane and is not on main at 9a997a5):

| Quantity | Tolerance |
|---|---|
| belief, placement, placement audit, expected gain, entropy_bits | absolute 1e-6 |
| `engine_choice.site`, `status`, `warning` | exact match |
| circuit reference voltages | 1e-3 V (`test_circuit.py`) |
| replay reading against the web step reading | 1e-3 V (ReplayClient rule) |

## 9. Tests that pin this contract

`engine/tests/test_api.py` (httpx `ASGITransport`) covers health, domains, catalog order and the flag, the three modes, the 422, 404, 405, 409, 413 and 500 envelopes, CORS allowed and disallowed (including on 413 and 500), and that every float is finite. `test_fixtures.py` recomputes every fixture and checks the unresolved pair. `test_worked_example.py` checks the demo numbers. `test_circuit.py` checks the six reference voltages and the class count. `test_thermometer.py` checks the simulated domain. `test_settings.py` checks the CORS parsing rules (comma list, `*` and empty entries rejected). `test_store.py` checks the in-memory store.

## 10. Worked example walkthrough (curl)

Recorded values from `engine/fixtures/parity/worked_example.json` (`git_sha` `d4731fcec20e27998e4db258971a04b43da98a73`, generated 2026-10-25T17:20:15+00:00). The fixture is authoritative; if a value here disagrees with it, the fixture wins and this section gets fixed. Values are rounded for display.

Prior (uniform over 33 hypotheses, computed by the engine): entropy `log2(33)` = 5.044 bits. Prior expected gain by row, from `prior_instruction.gain_bits`: 0.585, 3.278, 3.511, 3.033, 2.692, 3.401 bits, so row 3 is chosen first.

Step 0, create the replay session. Set `ID` from the `session_id` field of the response.

```bash
curl -s -X POST http://localhost:8000/v1/sessions \
  -H 'Content-Type: application/json' \
  -d '{"domain":"circuit","mode":"replay","seed":1,"fixture":"worked_example","reveal":"after_step"}'
```

Expected shape (abbreviated): `instruction` = `{site: 2, label: "row 3"}`, `entropy_bits` 5.044, `status` `continue`, `true_hypothesis` `null` (no step has run yet).

Step 1, the hand lands on row 2 and reads 3.671 V.

```bash
curl -s -X POST http://localhost:8000/v1/sessions/$ID/step \
  -H 'Content-Type: application/json' -d '{}'
```

Recorded (fixture step 0): `instruction.site` 2; `landed_site` 1 (row 2, revealed because `reveal = after_step`); `reading` 3.671; `placement.probs` [0, 0.99999972, 2.8e-7, 0, 0, 0]; `placement.warning.active` true with `p_off_site` 0.99999972 and `likely_site` 1 (row 2); top classes `R3_short` 0.631, `R3_10x_low` 0.345, `R7_10x_low` 0.012; `entropy_bits` 1.0995; `status` `continue`; `misfit.active` false; `baseline` (published method) top `R2_short` at 1.000 (wrong).

The engine's own choice at this step is row 6 (0.972 bits, against 0.868 bits for row 3). The replay tells the user row 3 (`next_told_site` 2) because the scripted demo says so; the fixture records both.

Step 2, the user probes row 3 again and reads 0.338 V.

```bash
curl -s -X POST http://localhost:8000/v1/sessions/$ID/step \
  -H 'Content-Type: application/json' -d '{}'
```

Recorded (fixture step 1): `reading` 0.338; `landed_site` 2 (row 3); `placement.warning.active` false; `status` `resolved`; `diagnosis` = `{hypothesis_id: "R3_10x_low", confidence: 0.975}`; `entropy_bits` 0.174; `next_instruction` `null`; `baseline` top `R3_10x_high` at 1.000 (the published method is certain again, on a different wrong hypothesis).

Checks: step 1 shows the warning active and the published method certain on `R2_short`; step 2 shows `resolved` on `R3_10x_low`. The brief's expectations were 63.5% and 97.6% for the two candidates; the recorded values are 63.1% and 97.5%. The brief's numbers are not our claim.

## 11. Web mapping (`apps/web/src/engine/schemas.ts` to the store)

`schemas.ts` is a Zod mirror of these schemas. Every response is parsed with Zod at the boundary. A parse failure becomes `api_error` with a human sentence, and the detail goes to the console in dev only.

| API field | Store field (`state/types.ts`) | Rule |
|---|---|---|
| `placement.warning` (WarningView) | `warning: Warning \| null` | `active: false` maps to `null`. Within Warning: `toldSite` comes from `instruction.site` of the same step, `likely_site` to `likelySite`, `p_off_site` to `pOffSite`, `text` to `text` |
| `misfit` (MisfitView) | store field to be decided by the web lane | `active: true` means the reading did not match the circuit; the UI shows `text` and keeps the same instruction |
| `entropy_bits` | `entropyBits` | same value |
| `placement.probs` | `placement` | same order, index = 0-based site |
| `placement_audit[]` | `ReadingEntry` retrospective note | proposed addition. Not in the frozen store draft (B4), so it must be decided before `types.ts` freezes |
| `landed_site` | `reveal.landedSite` | written only inside `finishReveal(token)`, never earlier |
| `next_instruction` | `instruction` | `{site, label, spoken}` |
| `status` | `reveal.next` | `continue` to `awaiting_reading`, `resolved` to `resolved`, `unresolved` to `unresolved` |
| `diagnosis` | `diagnosis` | `{hypothesisId, label, confidence, spoken}` |
| `unresolved` | `unresolved` | `{classes, reason, text}`. `classes` is a list of lists of ids; the store type (`string[] \| null` in the draft) must be aligned by the web lane, for example by flattening the first class |
| `baseline` | `baseline` | `{belief, diagnosis}`; shadow arm, UI label "published method" |
| `belief` | `belief` | same order as `catalog.hypotheses` |
| `reading` (replay) | `ReadingEntry.value` | ReplayClient rejects a difference above 1e-3 with `not_next_in_replay` |

Site identity: the store uses the engine's 0-based index. Labels come from `catalog.sites[i].label` (rule: 1-based in UI, 0-based in arrays).

## 12. Change policy

- Additive changes (new optional field, new endpoint, new error code) stay in `/v1`. They are recorded in this file and in the PR. Clients must ignore unknown response fields. `misfit` (invariant 11) was added this way.
- Breaking changes (rename, removal, changed meaning, units, ordering, or status values) go to `/v2`, side by side. `/v1` stays up until every web lane has moved.
- `schemas.py` is the source of truth once it exists. When it disagrees with this file, this file is fixed in the same PR.
- `doc-updater` updates this file in the same PR as any change to `schemas.py`, `errors.py`, `guard.py`, `settings.py`, or the fixture schema.
- A fixture schema change bumps `schema_version` (now 2). The recorder refuses silent overwrite.

Superseded names (do not reintroduce): `POST /sessions/{id}/readings`, `landed_row`, `p_off_row`, `candidates`, root-level `GET /catalog`, root-level `GET /health`, `true_fault`, `volts` in step bodies (plan reconciliation 1 keeps engine names).
