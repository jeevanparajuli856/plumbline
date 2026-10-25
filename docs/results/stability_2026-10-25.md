# Stability: 5 seeds x 300 simulated faults per method (circuit)

**Simulated. Preliminary. Not peer reviewed.** All results are simulated: a simulated hand on our own circuit model, not people.

- Command: `uv run --project engine python -m plumbline.experiments.stability`
- Git SHA: `d4731fcec20e27998e4db258971a04b43da98a73`
- Generated: 2026-10-25T17:20:57+00:00
- Seeds: [1, 2, 3, 4, 5]; n per arm per seed: 300

The simulated hand here uses the same confusion model the engine assumes (P(lands on told site) 0.78, P(one site away) 0.08 each side, P(two sites away) 0.03 each side, clipped at the edges): this is the matched-model case. The stress tests are `mismatch_<date>.md` (hands that break the assumption) and `sweep_<date>.md` (the true landing rate varied, with the engine's model matched or held fixed).

| Method | Faults (pooled) | Correct % (mean ± sd) | Resolved correct % (mean ± sd) | Confidently wrong % (mean ± sd) | Unresolved % (mean ± sd) | Mean steps | Warning precision (correct/issued) | Slip recall (warned/slips) | Out-of-model readings |
|---|---|---|---|---|---|---|---|---|---|
| plumbline | 1500 | 99.5 ± 0.4 | 93.0 ± 1.2 | 0.5 ± 0.4 | 6.5 ± 1.2 | 2.16 | 526/531 | 526/615 | 0 |
| entropy_exact | 1500 | 72.3 ± 2.6 | 68.3 ± 2.9 | 27.7 ± 2.6 | 4.3 ± 1.3 | 1.67 | n/a | 0/483 | n/a |
| checklist | 1500 | 58.6 ± 3.7 | 55.5 ± 3.1 | 41.4 ± 3.7 | 3.4 ± 1.0 | 2.91 | n/a | 0/738 | n/a |
| random | 1500 | 56.6 ± 2.7 | 53.9 ± 2.5 | 40.9 ± 2.7 | 5.6 ± 0.9 | 2.97 | n/a | 0/825 | n/a |
| remeasure_until_agree | 1500 | 92.6 ± 0.9 | 87.4 ± 1.1 | 4.5 ± 1.0 | 8.1 ± 0.4 | 5.24 | n/a | 0/1504 | n/a |

Definitions: *correct* = the run ended resolved on the true hypothesis, or ended unresolved as *indistinguishable* with the truth inside the refused class (the LED_open / LED_reversed pair counts as correct when the truth is in it); runs that end at the 12 readings limit or with no informative site left are not correct. *Resolved correct* = resolved on the true hypothesis only. *Confidently wrong* = the final top class excludes the truth and holds at least 0.9 of the belief. *Resolved* = top class mass at least 0.95 on a single-member class. A *warning* fires when P(probe off the told site) > 0.5; *warning precision* = warnings issued on a real slip / warnings issued; *slip recall* = slips that drew a warning / slips (both count the same events, so the numerators match). Only plumbline issues warnings. An *out-of-model reading* is more than 5 sigma from every predicted reading the hand could reach; plumbline then keeps its belief and asks for the same site again, and the reading still counts as a step.
