# ADR-0006: TS port gated by parity (<1e-6) drives replay/offline; API drives simulate/live until then

Status: accepted, 2026-10-25

## Context

The brief's demo must "replay deterministically from a fixture at all times" (rule 6). The PWA
must work offline (ADR-0009), and the deployed site must complete the worked example even when the
API is asleep (ADR-0005). Those needs argue for running the inference in the browser. Rule 2 of
`00-plumbline.md` makes the Python engine the source of truth, and `CLAUDE.md` says the TypeScript
port in `apps/web/src/engine` may drive the demo only after the parity suite passes.

A port is a second implementation of the same math. Without a gate, two implementations drift
apart silently, and a judge who runs the Python suite and the browser can see different numbers.
The gate has to be numeric, recorded, and checked on every run.

## Decision

Parity is measured on recorded fixtures. The Python engine writes the fixtures through `Session`
only. The recorder (`record_fixtures.py`) refuses a silent overwrite. The nine fixtures in
`engine/fixtures/parity/` are: `worked_example`, `seed_1` through `seed_5`, `slip_heavy`,
`unresolved_pair` (LED_reversed), and `thermometer_demo`.

The web tests read the same files through a Vite alias `@fixtures` that points at
`engine/fixtures`. There is no copy script, so there is no drift between the two trees.

Per step, the TypeScript output must match the Python output within 1e-6 (absolute) for belief,
placement, placement audit, expected gain, and entropy. The engine choice site, the status, and
the warning flag must be identical. The parity test is `apps/web/src/engine/__tests__/parity.test.ts`
(plan, Architecture v1, engine fixtures; the path follows the folder map in Appendix B3).

Until parity passes, the browser replays recorded Python outputs only. `ReplayClient` validates
the fixture with Zod and returns the recorded values. It does not compute inference in TypeScript.
It rejects a reading that differs from the recorded reading by more than 1e-3 (`not_next_in_replay`).
`simulate` and `live` use `ApiClient`.

After parity passes (Sprint 3, Nov 9 to 22), the port lives at `apps/web/src/engine/local`, and
`chooseClient` selects `LocalClient` for simulate and for live when the parity flag is set. Replay
keeps using recorded outputs. The plan does not say whether live mode must work offline, so that
is an open question for `docs/BUILD_PLAN.md`.

Provisional fixture: before the recorded fixtures are swapped in, web lanes use a hand-typed
fixture under `apps/web/src/fixtures/provisional/`. The UI badges it PROVISIONAL, and the production
build refuses it. The plan contradicts itself on when the swap happens. Reconciliation 3 says "until
day 4", and the Sprint 1 integration table says the swap happens at day 6. This ADR records both
and leaves the date to `docs/BUILD_PLAN.md`.

If parity fails on a fixture, the implementation is fixed, not the fixture, unless the fixture is
provably wrong (`testing.md`).

## Consequences

Positive:

- The demo has a replay path that cannot depend on the math in the browser. The worked example
  is safe even if the port is wrong.
- The parity number is checkable. "Parity to 1e-6 on nine fixtures" is a statement a judge can
  reproduce by running the two test suites.

Negative:

- Two implementations of the math must be kept in step. Each engine change needs a fixture
  re-record and a parity run.
- A 1e-6 absolute tolerance is tight for log-space sums and quadrature. Floating point order
  differences can break it, so the port must use the same log-sum-exp order and the same
  Gauss-Hermite nodes (`quadrature` table in the fixture config).
- The provisional fixture adds a short period where the browser shows numbers that are not yet
  recorded from Python. The badge and the build refusal are the control.

What to re-visit:

- If parity cannot hold at 1e-6 on all nine fixtures, reopen the tolerance with a measured reason,
  not a convenient one.
- If handsight arrives with its own outputs, its outputs can become a tenth fixture source. Decide
  then whether it joins the parity set.
- Decide the live-mode offline question before Sprint 3.

## Alternatives considered

- **Port first, no server path.** Rejected: it puts schedule risk on the one path that must work,
  and rule 2 makes the Python output the reference the port is judged against.
- **Compile the Python engine to WebAssembly (for example Pyodide).** Not evaluated in this ADR. It
  would add a large runtime to the offline cache, which conflicts with the 300 kB gzip app budget
  in the size-limit configuration. It remains an option if the port fails parity.
- **Server only, no offline path.** Rejected: it breaks the offline replay requirement and the
  "API asleep" case in ADR-0005.
- **Copy the fixtures into the web tree.** Rejected: two copies drift. The Vite alias keeps one
  source.
