# Stability: 5 seeds x 300 simulated faults per method (circuit)

**Simulated. Preliminary. Not peer reviewed.** All results are simulated: a simulated hand on our own circuit model, not people.

- Command: `uv run --project engine python -m plumbline.experiments.stability`
- Git SHA: `6dde58a12302c3c2c9cbbf7af42c9e2560c21d95`
- Generated: 2026-10-25T16:56:41+00:00
- Seeds: [1, 2, 3, 4, 5]; n per arm per seed: 300

| Method | Faults (pooled) | Correct % (mean ± sd) | Confidently wrong % (mean ± sd) | Unresolved % (mean ± sd) | Mean steps | Warnings correct/issued | Slips warned |
|---|---|---|---|---|---|---|---|
| plumbline | 1500 | 99.5 ± 0.4 | 0.5 ± 0.4 | 6.5 ± 1.2 | 2.16 | 526/531 | 526/615 |
| entropy_exact | 1500 | 72.3 ± 2.6 | 27.7 ± 2.6 | 4.3 ± 1.3 | 1.67 | n/a | 0/483 |
| checklist | 1500 | 58.6 ± 3.7 | 41.4 ± 3.7 | 3.4 ± 1.0 | 2.91 | n/a | 0/738 |
| random | 1500 | 58.1 ± 2.2 | 40.9 ± 2.7 | 5.6 ± 0.9 | 2.97 | n/a | 0/825 |
| remeasure_until_agree | 1500 | 94.5 ± 1.0 | 4.5 ± 1.0 | 8.1 ± 0.4 | 5.24 | n/a | 0/1504 |

Definitions: *correct* = the final top distinguishability class contains the true hypothesis; *confidently wrong* = the final top class excludes the truth and holds at least 0.9 of the belief; *unresolved* = the session ended unresolved (indistinguishable, no informative site, or 12 readings); a *warning* is correct when the simulated probe really was off the told site. Only plumbline issues placement warnings.
