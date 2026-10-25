# ADR-0010: Baselines: published entropy-exact method live in-engine; LLM comparison as a static, dated, recorded transcript (no API keys in app)

Status: accepted, 2026-10-25

## Context

The plan's reality check says judges reward a baseline comparison and a reproducible test. The
brief's core claim (section 2 and section 5) is a comparison against the published method, entropy
selection with an exact probe position (Gao et al., 2014, cited in the brief section 4), and against
a fixed checklist and a random probe order. The brief's section 11 also asks for a side-by-side with
a general chat model given the same netlist and the same one-measurement-at-a-time protocol.

Two rules constrain the LLM side. Rule 1 requires every number to trace to a command or a DOI. The
security rule and the plan's "no API keys in app" stance rule out a live model call from the
browser. A live call would also make the demo non-deterministic and dependent on a network and a
billing account. The CircuitSense result (arXiv 2509.22339, cited in the brief section 3) is the
reason the comparison is worth showing: the brief's cited figures are 19.06% derivation for
Gemini-2.5-Pro, 6.29% for Claude-Sonnet-4, and 4.98% for GPT-4o. Those are the published numbers as
the brief cites them. They were not re-verified in this session.

## Decision

Baselines are in the engine. `engine/plumbline/baselines.py` defines a `Baseline` Protocol with
`start`, `observe`, and `choose`. The four baselines are:

- `EntropyExact`: entropy-based selection with the exact probe position (no confusion model). This
  is our implementation of the published method, so it is the baseline that changes exactly one
  thing.
- `Checklist`: a fixed troubleshooting order.
- `RandomOrder`: a seeded random order.
- `RemeasureUntilAgree`: repeats the same row until two readings agree.

In a session, a baseline runs in shadow mode. It sees the same readings and reports its own belief
and diagnosis (`BaselineView` with `shadow` true). In experiments, each arm has its own instructions
on the same truths and the same random stream (`experiment.py`: plumbline, entropy_exact, checklist,
random, remeasure_until_agree).

The brief's expectation, not our run, for the headline comparison: Plumbline correct 99.0 plus or
minus 0.4%, wrong at over 90% confidence 1.0 plus or minus 0.4%. Entropy exact 78.7 and 21.2 (plus or
minus 1.8 each). Checklist 69.8 and 28.5. Random 70.2 and 28.3. The brief also reports 178 warnings of
which 176 were correct, and a 21x reduction. Those figures come from 1500 simulated faults per arm over
five seeds, and they are re-run inside `engine/` before any slide uses them as ours.

Scratch reconstruction on 2026-10-25, to be re-run inside `engine/`: in the worked example, the
published method (`R2_short`) reaches 100% after the first reading, and Plumbline's top candidate
(`R3_short`) reaches 63.1% and fires the placement warning (P(off) 1.0).

The LLM comparison is a static, dated, recorded transcript. It lives in `public/transcripts/`
as `chatgpt-<date>.json`, with the model name, the date of the session, the netlist given, and the
protocol used. The Evidence page shows it as a TranscriptExhibit. The app makes no calls to any model
and holds no API keys. The transcript is labeled as one recorded session. It is not a benchmark.

## Consequences

Positive:

- The baseline numbers come from code in this repo, so a judge can rerun them.
- No keys, no network dependency, and no non-determinism in the comparison the audience sees.
- The transcript shows the real failure mode of a general model on this task, with its date.

Negative:

- The published-method baseline is our implementation. The brief's section 10 notes that an
  independent implementation would be stronger.
- One recorded chat session is an anecdote. It must be presented as one, and it goes stale when the
  model changes.
- The protocol used with the chat model could be challenged. The transcript states the prompts and
  the one-measurement-at-a-time rule to answer that.

What to re-visit:

- After the Ruston measurement, re-run the experiments with the measured confusion matrix. The sweep
  changes if the measured value sits outside 0.60 to 1.00.
- Re-record the transcript if the model changes, and keep the old one with its date.
- Ask for an independent implementation of `EntropyExact` if one becomes available, and re-run the
  comparison against it.
- Re-check the cited CircuitSense figures against the paper before a judge asks.

## Alternatives considered

- **Live model calls during the demo.** Rejected: API keys would sit in the app, the demo would depend
  on a network and a billing account, and the output would change between runs.
- **Compare only to the numbers in the published paper.** Rejected: the paper's setting is not our
  circuit, hands, or meter. The comparison needs identical truths, hands, and meter.
- **Drop the LLM comparison.** Rejected: the side-by-side is the strongest moment in the brief's
  ten-minute outline, and CircuitSense explains why the comparison matters.
- **An automated LLM benchmark in CI.** Rejected: it needs keys in CI, costs money on every run, and
  adds a non-deterministic check to `pnpm verify`.
