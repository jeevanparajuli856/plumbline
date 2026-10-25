# Lane requests from `lane/engine`

Changes outside `engine/` and `docs/results/` that this lane needs. They were not made here, because that is outside this lane's write surface.

## 1. `docs/API_CONTRACT.md`: bring it in line with `engine/plumbline_api/schemas.py`

schemas.py is the source of truth (contract section 12). The divergences:

- `GET /v1/health` returns `{status: "ok", version}`.
- `GET /v1/domains/{domain}/catalog` takes the query flag `include_expected_readings=true`. That is the "mechanism proposed" for `expected_readings`. Without the flag the field is `null`.
- `POST /v1/sessions` returns 201. Extra rules, each a 422 `validation_error` with `details.field`:
  - `true_hypothesis` outside simulate is rejected.
  - `fixture` outside replay is rejected.
  - Replay needs `fixture`.
  - `sigma` and `confusion` are rejected in replay, because replay uses the fixture's own config.
  - `sigma` is bounded to (0, 100].
  - `seed` is a strict int.
- Replay with a fixture from another domain returns 409 `fixture_mismatch` (`details.field = "domain"`).
- `StepView.step_index` and `AuditView.step_index` are 0-based.
- `placement_audit` has one entry per step up to and including the current step. The contract says "one entry per earlier step".
- `UnresolvedView.classes` is a list of lists of ids, matching the Zod mirror. It holds the single indistinguishable class for `indistinguishable`. For `no_informative_site` and `max_steps` it holds the top classes until 0.95 of the mass is covered, with at most 5 classes (`UNRESOLVED_MAX_CLASSES`).
- `WarningView.text` is `""` when the warning is inactive.
- **Additive** `StepView.misfit: {active, sigmas, text}`, always present. `active` is true when the reading is more than `OUT_OF_MODEL_SIGMAS` = 5 sigma from every V_f(l) with P(l|n) > 0. When it is active:
  - belief and placement are not updated;
  - placement is the landing prior P(l|n), and the warning is inactive;
  - status stays `continue` unless the step limit is reached (12 readings, `max_steps`), and the next instruction is the same site;
  - `text` is a domain sentence asking the user to check contact and measure again.
  No new status or reason was added. The fixture step carries the same `misfit` object, `config.thresholds.out_of_model_sigmas` was added, and the fixture `schema_version` is now 2. `ThresholdsView` gains `out_of_model_sigmas`.
- `BaselineView.diagnosis` is present when the published method's top class holds at least 0.95 of the mass. Otherwise it is `null`.
- `SessionView.true_hypothesis` and `StepView.landed_site` are always present as keys and are `null` when hidden (invariants 6 and 7).
- `SessionView.config` is `{sigma, confusion (K x K matrix), thresholds {resolve, placement_warning, min_gain_bits, class_tolerance, max_steps}}`.
- Extra error codes: 404 `not_found` and 405 `method_not_allowed` for unknown routes and methods, so every error uses the envelope. Validation `details` is `{errors: [{loc, msg, type}]}`.
- Fixture shape additions, all additive: `steps[].likely_site`, `steps[].unresolved` (always present, `null` unless unresolved), `source_mode`, `seed`, `simulated`, `config.domain_parameters` (LED calibration, ADR-0002), `config.truth_confusion` (simulate-sourced fixtures), `catalog.expected_readings`. The thresholds keys are `resolve, placement_warning, min_gain_bits, class_tolerance, max_steps`; the contract's illustration uses `class_tolerance_v`.
- Section 10 can now quote the fixture. The values match the scratch values to three decimals. See the lane report.

## 2. `apps/web/src/engine/schemas.ts` (web lane)

- Add `likely_site: z.number().int()` to `FixtureStep`. The recorder writes it, and the parity test can then check the warning's `likely_site`.
- Optional tightening: `SessionView.status` could be `z.enum(['continue','resolved','unresolved'])` instead of `z.string()`.

## 3. Docs with scratch numbers the engine now replaces (doc-updater)

- `docs/ARCHITECTURE.md` section 5.2 and ADR-0003: the thermometer demo's P(off site) is **0.059** in the engine (fixture `thermometer_demo.json`), not the scratch 0.009. `medium_well` 0.947 and the separations 2.96 to 4.98 C match. No warning fires in either case.
- `.claude/rules/00-plumbline.md` and the brief text still say 31 classes. The engine computes 32, with the only multi-member class {LED_open, LED_reversed}.
- `docs/EVIDENCE.md` and `docs/PITCH.md` can cite `docs/results/stability_2026-10-25.md` and `experiment_2026-10-25.md`, labeled simulated and preliminary, in place of the brief's expectations.

## 4. Web fixtures

- `apps/web/src/fixtures/provisional/worked_example.json` can be retired in favour of `engine/fixtures/parity/worked_example.json`, which is recorded and parses with `Fixture`. The provisional step-1 `entropy_bits` of 1.161 is wrong; the recorded value is 1.0995.

## 5. Repo hygiene

- The root `.coverage` (the coverage database) is tracked on main (commit 4e25913), and every coverage run from the repo root dirties it. Untrack it and add `.coverage` and `.coverage.*` to the root `.gitignore` at integration. This lane restored the root file each time and did not commit it.
- This lane did accidentally commit `engine/.coverage`, in 56a3aa6 and 1c3d21c. It is now untracked (`git rm --cached`) and ignored by a new `engine/.gitignore`.
