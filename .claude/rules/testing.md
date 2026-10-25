# Testing

Adapted from ECC `rules/common/testing.md` for this repo's stack.

## Targets
| Area | Tool | Coverage target | Notes |
|---|---|---|---|
| `engine/` (Python) | pytest | 90% on `engine.py`, `circuit.py` | Numerical tests assert against reference voltages to 1e-3 |
| `apps/web/src/engine/` (TS port) | vitest | 90% | Parity suite replays `fixtures/parity/*.json` recorded from Python |
| `apps/web/src/state`, `voice`, utils | vitest | 80% | Pure logic, no DOM where possible |
| `apps/web/src/scene/` (3D) | vitest + `@react-three/test-renderer` | smoke | Mounts without throwing, exposes expected object names; no pixel tests |
| Critical flow | Playwright | 1 happy path + 1 slip path | Worked example replay via fixture; runs headless in CI |

## TDD is the default
1. Write the failing test (RED). 2. Run it, see it fail. 3. Minimal code to GREEN. 4. Refactor. 5. Check coverage.
The `tdd-guide` agent enforces this for engine and port work. UI polish may iterate visually first, but any logic extracted from a component gets a test.

## Rules
- Arrange-Act-Assert; descriptive test names (`warns_when_posterior_mass_off_instructed_row_exceeds_half`).
- Fix the implementation, not the test, unless the test is provably wrong.
- Fixtures over mocks for the engine: record real Python outputs into JSON; both Python and TS tests consume the same files.
- Never test random behavior without a seed. All stochastic code takes an explicit `seed`/`rng`.
- Flaky E2E: retry once in CI, then fix the root cause. See skill `e2e-testing`.

## Commands (after `/bootstrap`)
```
pnpm test              # vitest, all packages
pnpm test:e2e          # playwright
uv run --project engine pytest
pnpm verify            # typecheck + lint + unit + python, used by /verify
```
