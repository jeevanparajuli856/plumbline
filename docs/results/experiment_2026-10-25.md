# Experiment: methods compared on 400 simulated faults (circuit)

**Simulated. Preliminary. Not peer reviewed.** All results are simulated: a simulated hand on our own circuit model, not people.

- Command: `uv run --project engine python -m plumbline.experiments.experiment 400`
- Git SHA: `9e98ddfc532023551e65940e05e51d1c3e68f84d`
- Generated: 2026-10-25T17:11:49+00:00
- Seeds: [1]; n per arm per seed: 400

The simulated hand here uses the same confusion model the engine assumes (P(lands on told site) 0.78, P(one site away) 0.08 each side, P(two sites away) 0.03 each side, clipped at the edges): this is the matched-model case. The stress tests are `mismatch_<date>.md` (hands that break the assumption) and `sweep_<date>.md` (the true landing rate varied, with the engine's model matched or held fixed).

| Method | n | Correct % | Resolved correct % | Confidently wrong % | Unresolved % | Mean steps | Warning precision (correct/issued) | Slip recall (warned/slips) | Out-of-model readings |
|---|---|---|---|---|---|---|---|---|---|
| plumbline | 400 | 99.2 | 93.0 | 0.8 | 6.2 | 2.18 | 166/168 | 166/183 | 0 |
| entropy_exact | 400 | 68.2 | 65.5 | 31.8 | 3.0 | 1.66 | n/a | 0/143 | n/a |
| checklist | 400 | 59.0 | 55.0 | 41.0 | 4.5 | 2.92 | n/a | 0/201 | n/a |
| random | 400 | 58.0 | 55.2 | 39.5 | 5.2 | 2.81 | n/a | 0/207 | n/a |
| remeasure_until_agree | 400 | 92.8 | 87.8 | 3.8 | 8.5 | 5.33 | n/a | 0/422 | n/a |

Definitions: *correct* = the run ended resolved on the true hypothesis, or ended unresolved as *indistinguishable* with the truth inside the refused class (the LED_open / LED_reversed pair counts as correct when the truth is in it); runs that end at the 12 readings limit or with no informative site left are not correct. *Resolved correct* = resolved on the true hypothesis only. *Confidently wrong* = the final top class excludes the truth and holds at least 0.9 of the belief. *Resolved* = top class mass at least 0.95 on a single-member class. A *warning* fires when P(probe off the told site) > 0.5; *warning precision* = warnings issued on a real slip / warnings issued; *slip recall* = slips that drew a warning / slips (both count the same events, so the numerators match). Only plumbline issues warnings. An *out-of-model reading* is more than 5 sigma from every predicted reading the hand could reach; plumbline then keeps its belief and asks for the same site again, and the reading still counts as a step.
