# ADR-0002: Rebuild the engine test-first from the six-line math; `handsight` becomes the parity reference when it arrives

Status: accepted, 2026-10-25

## Context

The brief (section 2 and section 6) says the engine is built and reproducible on the original
machine. It names the files (`circuit.py`, `engine.py`, `experiment.py`, `stability.py`,
`mkfigs.py`) and gives a reproduce command, `cd handsight; python3 experiment.py 400`. The plan
records that the teammate's `handsight` folder is not on this machine and that the teammate
(Pankaj Bhatta) is mostly unavailable. On 2026-10-25 a search of the Desktop tree to depth 4 for a
folder matching `*handsight*` returned nothing. The brief's headline figures therefore cannot be
re-run here. They are the brief's expectation, not our run.

`CLAUDE.md` still says the engine "wraps the teammate's `handsight` scripts without rewriting
them". This ADR supersedes that line. The six-line math in `.claude/rules/00-plumbline.md` is the
specification that can be implemented and tested now, without the missing code. Rule 2 of the same
file makes the Python engine the source of truth, so the engine must be written in `engine/` and
tested there before any other implementation is trusted.

## Decision

Write the engine from the math, test-first (tdd-guide), inside `engine/`. The package layout is
`engine/plumbline` (config, model, confusion, engine, session, baselines, `domains/circuit.py`,
`domains/thermometer.py`, record_fixtures, experiments) and `engine/plumbline_api` (FastAPI).

The circuit netlist is the reconstructed one from Appendix A1 of the plan. The ground rail is the
battery negative, not a site. The sites are rows 1 to 6. The battery is 9.0 V between row 1 and
ground. R1 is 1 kOhm between rows 1 and 2. The divider is R2 2.2 kOhm (rows 2 to 3) and R3 2.2 kOhm
(row 3 to ground), with R4 4.7 kOhm (rows 3 to 6) and R5 4.7 kOhm (row 6 to ground). The LED branch is
R6 330 Ohm (rows 2 to 4), a diode with a piecewise linear model (Vf0 2.0 V, Rs 20 Ohm) from row 4 to
row 5, and R7 100 Ohm (row 5 to ground).

The LED parameters (Vf0 2.0 V, Rs 20 Ohm) were chosen so that the worked example's first-step top
candidate matches the brief's story. Appendix A1 records that (1.8 V, 68 Ohm) flips that candidate
to the correct fault, which contradicts the brief. This is a calibration choice made to match a
published story. It is recorded here so it is not hidden, and the parity fixtures must state the
values used.

Scratch reconstruction on 2026-10-25, to be re-run inside `engine/`: nominal node voltages for
rows 1 to 6 are 9.0000, 3.8708, 1.7326, 2.4989, 0.4157, 0.8663 V, with a residual of 0.359 mV.
The 33-entry fault catalog reduces to 32 classes at a 1e-3 V tolerance, because `LED_open` and
`LED_reversed` are electrically identical. The brief said 31 classes. We report 32 and label the
difference. The worked example in scratch gives a published-method top candidate `R2_short` at
100% and a Truehand top candidate `R3_short` at 63.1% after the first reading (the brief said
63.5%). After the second reading at 0.338 V, `R3_10x_low` is at 97.5% (the brief said 97.6%). We
show our numbers with the label above.

Handsight becomes the parity reference when it arrives. Sprint 3 adds `engine/plumbline/legacy/`
(the adapter) and `test_legacy_parity.py`. Differences are resolved by reading the two code paths,
not by editing one set of numbers to match the other.

## Consequences

Positive:

- The engine does not depend on code we cannot run. Every behavior is pinned by a pytest file
  (plan Appendix A7), and every number shown in the UI comes from a command in this repo.
- The recorded fixtures (`engine/fixtures/parity/`) become the shared contract for the Python
  and TypeScript suites (ADR-0006).

Negative:

- Some work is duplicated. If handsight is a complete, working implementation, the rebuild is a
  second implementation of the same math.
- The LED calibration is a fitted choice. The sensitivity to Vf0 and Rs is exactly the sort of
  thing a judge can ask about. The answer must be stated, not hidden.
- Until handsight arrives, the brief's reproduce commands cannot be run and the brief's figures
  stay labeled as expectations.

What to re-visit:

- Re-base when Pankaj's handsight code arrives. Run its `experiment.py` and diff the class count
  (32 here, 31 in the brief), the first-step candidate (63.1% here, 63.5% in the brief), and the
  second-step candidate (97.5% here, 97.6% in the brief). Record each difference as a fixture or
  a note. Do not edit either side to match the other.
- Replace the LED calibration with measured values if the lab data allows it, and re-run
  the worked example.

## Alternatives considered

- **Wrap the handsight scripts as they are** (the original `CLAUDE.md` plan). Rejected: the code is
  not on this machine, so the demo would depend on a file we cannot run or test.
- **Port handsight straight to TypeScript.** Rejected: rule 2 makes Python the source of truth, and
  the port cannot be gated against a reference it does not have.
- **Use an existing circuit simulator package** (for example PySpice or ngspice). Not evaluated in
  this ADR. It would add an external binary to the demo laptop. The resistive network plus one
  piecewise linear diode is small enough to write, test, and explain in a few hundred lines.
