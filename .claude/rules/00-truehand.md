# Truehand: project invariants (always loaded)

Truehand is an assistant for blind hands that cannot tell you something it has not measured.
It infers the circuit fault AND the probe's true position jointly from each multimeter reading,
so it can say "that number came from row 2, not row 3" instead of confidently naming the wrong part.
Nexus Technology Cup 2026, College Track. Team: Jeevan Parajuli, Pankaj Bhatta (ULM). Finals Dec 14-16, 2026.

## Non-negotiables

1. **Honesty of numbers.** Every figure shown in the UI, docs, or pitch traces to a file in `engine/` or a DOI.
   Never invent accuracy, confidence, timing, or user-study numbers. If a value is simulated, label it "simulated".
2. **The engine is the source of truth.** Python in `engine/` (circuit solver + joint inference) defines behavior.
   The TypeScript port in `apps/web/src/engine/` must pass the parity suite against recorded Python outputs before it drives the demo.
3. **Refusal is a feature.** When fault classes are electrically indistinguishable, the UI says "unresolved" and asks for another reading. Never force a single answer.
4. **Accessibility first.** The primary user cannot see the screen. Every 3D state has a DOM/`aria-live` mirror and a spoken equivalent. Keyboard and voice must drive the whole demo flow. The 3D scene is for sighted judges; the text/voice channel is the product.
5. **Scope discipline.** Do not build: user accounts, a database, analytics dashboards, a separate native mobile codebase, cloud state, auth. Allowed: a Capacitor wrapper of the same web app for iOS at the finals (ADR-0009) and an env-flag passphrase gate for private previews (ADR-0007). Every hour there is an hour not spent on the one novel thing.
6. **Demo reliability over features.** The worked example (true fault R3 10x too small, told row 3, hand lands row 2, reads 3.671 V, then 0.338 V) must replay deterministically from a fixture at all times.

## The math (six lines, keep it visible)

```
P(l | n)      confusion model: told row n, probe lands on row l   (0.78 / 0.08 / 0.03 by default; measured later)
P(r | f, n) = SUM_l P(l | n) * Normal(r ; V_f(l), sigma)          sigma = 0.02 V
b'(f)       ∝ b(f) * P(r | f, n)                                  Bayesian update over faults
n*          = argmax_n [ H(b) - E_r[ H(b' | r) ] ]                 expected information gain
P(l != n | r) > 0.5  ->  say "your probe is not where you think it is"
```

Reference nominal node voltages (rows 1..6): 9.000, 3.871, 1.733, 2.499, 0.416, 0.866 V. The brief says 33 faults collapse to 31 distinguishable classes; our scratch reconstruction (2026-10-25) gives 32 with the pair LED_open/LED_reversed. Report whatever the engine computes.

## Where things live

| Path | What |
|---|---|
| `engine/` | Python package `truehand` (circuit.py, engine.py, experiments) + FastAPI app `truehand_api` |
| `apps/web/` | Vite + React 19 + TypeScript + React Three Fiber + Tailwind + Zustand |
| `apps/web/src/scene/` | 3D breadboard, probe, noisy-hand, belief overlays |
| `apps/web/src/engine/` | TypeScript port of the inference math + parity fixtures |
| `apps/web/src/voice/` | Web Speech API loop |
| `docs/` | ARCHITECTURE.md, API_CONTRACT.md, BUILD_PLAN.md, POSITIONING.md, DESIGN_REFERENCES.md, PITCH.md, VIDEO_STORYBOARD.md, EVIDENCE.md, CLAUDE_SETUP.md, decisions/ |
| `docs/brief/` | Original briefs, PDFs, Nexus dossier (read-only reference) |

## Working style for this repo

- Thin vertical slices. One end-to-end path first, then widen. See `docs/BUILD_PLAN.md`.
- Parallel lanes own disjoint write surfaces (`/lanes`). Never edit another lane's directory without saying so.
- Before API-specific 3D or React code, fetch current docs with `npx ctx7@latest docs /pmndrs/react-three-fiber "<topic>"` or `/pmndrs/drei`.
- Run `/verify` before any PR or merge. Commit messages: conventional commits.
