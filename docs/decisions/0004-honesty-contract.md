# ADR-0004: Honesty contract: every displayed number traces to a command or DOI; readiness panel shows build items done and user validation pending; simulated means labeled

Status: accepted, 2026-10-25

## Context

Rule 1 of `.claude/rules/00-plumbline.md` requires that every figure shown in the UI, docs, or
pitch trace to a file in `engine/` or a DOI. Rule 6 of `CLAUDE.md` says the same in other words.
The plan's reality check adds what the judges punish: "first ever" claims without a search,
invented interviews, AI wrappers, and hidden simulations. The same check says the Nexus rubric is
not published (four named criteria, no weights), so any scorecard shown to the judges would be a
homemade one and must not be presented as official.

The brief's headline figures are the most tempting source of error. The brief reports 99.0 plus
or minus 0.4% correct, a 21x reduction in confidently wrong diagnoses, and 178 warnings of which
176 were correct. Those came from a run on the original machine that cannot be repeated here
(ADR-0002). The brief itself says not to quote its average of 8.9. The user-validation evidence
(blind participants, the Louisiana Center afternoon, a measured confusion matrix) does not exist
yet. Only the Louisiana Center has agreed to help.

## Decision

1. **Traceability.** Every number shown in the UI, docs, or pitch traces to a command run in this
   repo, with its output written to `docs/results/` or `engine/fixtures/` (the output records the
   command, git SHA, and seeds), or to a cited paper or DOI. The evidence table names the command or
   file beside each figure.
2. **Labels for three kinds of number.** Figures from the brief are shown as "the brief's
   expectation, not our run". Figures from the plan's scratch computations are shown as "scratch
   reconstruction on 2026-10-25, to be re-run inside `engine/`". Simulated outputs carry a SIMULATED
   label in the DOM and in the scene, and `CatalogView.simulated` is true for the thermometer.
3. **Readiness panel.** The `/evidence` page holds an EvidenceTable with two parts. Build items show
   done and total, computed from the checklist in `docs/BUILD_PLAN.md`. User validation items
   (blind-user placement data, the Louisiana Center afternoon, a second real instrument, the measured
   confusion matrix, the blindfold run on camera) show PENDING with a date and plan. No percentage is
   shown for a validation item that has not happened.
4. **Provisional data.** The hand-typed provisional fixture carries a PROVISIONAL badge. The
   production build refuses to bundle it (plan, Architecture v1, engine fixtures).
5. **No homemade scorecard.** The product and the pitch do not show a rubric score or an average.
   Where the criteria are discussed, they are the four named Nexus criteria, quoted as named.
6. **Refusal is part of honesty.** When the engine cannot separate two faults, the UI says
   "unresolved" and does not pick one (rule 3).

## Consequences

Positive:

- A judge who asks where a number came from gets a file or a DOI, which the brief calls the
  standard for its own claims.
- The pending validation work is visible as pending. That protects the team if a judge asks about
  user studies.

Negative:

- Some slides will look less impressive. The headline is the 21x figure as an expectation, not a
  measured result, until the re-run inside `engine/` exists.
- The labeling rule adds upkeep. Each new figure needs a command or a DOI beside it.
- Enforcement is by review for now. No script checks that every number in the UI traces to a
  file. `pnpm verify` (root `package.json`) does not check traceability today.

What to re-visit:

- Add a check that greps UI and doc numbers against `docs/results/` and the fixtures, or accept
  review as the control. This is not built yet.
- Re-label the brief's figures once the re-run exists. The label changes from expectation to
  "measured in this repo, command X".
- Re-check the validation list at each sprint boundary, since the Louisiana Center visit and the
  measured confusion matrix are the two items most likely to change status.

## Alternatives considered

- **Lead with the brief's 99.0% and 21x.** Rejected: the numbers are not reproduced in this repo,
  and presenting them as ours would break rule 1.
- **Hide the simulation and present the thermometer as a real measurement.** Rejected: it violates
  rule 1 and invites the hidden-simulation penalty the plan names.
- **Show only measured numbers.** Rejected: the semifinal would have almost nothing to show. The
  chosen path shows the simulated and pending items with their labels, which keeps both the
  honesty and the working demo.
