# Experiment: methods compared on 400 simulated faults (circuit)

**Simulated. Preliminary. Not peer reviewed.** All results are simulated: a simulated hand on our own circuit model, not people.

- Command: `uv run --project engine python -m plumbline.experiments.experiment 400`
- Git SHA: `6dde58a12302c3c2c9cbbf7af42c9e2560c21d95`
- Generated: 2026-10-25T16:55:45+00:00
- Seeds: [1]; n per arm per seed: 400

| Method | n | Correct % | Confidently wrong % | Unresolved % | Mean steps | Warnings (correct/issued) | Slips warned |
|---|---|---|---|---|---|---|---|
| plumbline | 400 | 99.2 | 0.8 | 6.2 | 2.18 | 166/168 | 166/183 |
| entropy_exact | 400 | 68.2 | 31.8 | 3.0 | 1.66 | n/a | 0/143 |
| checklist | 400 | 59.0 | 41.0 | 4.5 | 2.92 | n/a | 0/201 |
| random | 400 | 58.8 | 39.5 | 5.2 | 2.81 | n/a | 0/207 |
| remeasure_until_agree | 400 | 94.5 | 3.8 | 8.5 | 5.33 | n/a | 0/422 |

Definitions: *correct* = the final top distinguishability class contains the true hypothesis; *confidently wrong* = the final top class excludes the truth and holds at least 0.9 of the belief; *unresolved* = the session ended unresolved (indistinguishable, no informative site, or 12 readings); a *warning* is correct when the simulated probe really was off the told site. Only plumbline issues placement warnings.
