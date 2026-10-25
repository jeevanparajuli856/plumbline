# ADR-0003: Domain-agnostic core + plug-in instrument models; domain 1 circuit (exact), domain 2 kitchen probe thermometer (simulated, labeled)

Status: accepted, 2026-10-25

## Context

The brief's impact argument (section 9) says the mechanism "generalizes past electronics to any
instrumented physical task: a scale, a thermometer, a pH meter, a caliper". It also says that this
generalization is "a claim, not a result" (section 10, weakness 6). The plan's reality check says
judges reward a domain-agnostic core shown on two instruments, with the honest label. Judges
punish a single-domain demo that looks like a one-off trick.

The brief's three studies (section 3) concern blind people and AI answers that cannot be checked.
They do not give a second instrument. So the second domain has to be simulated, and it has to be
labeled simulated everywhere it appears (ADR-0004). The circuit remains the only domain with
exact physics that can be checked against a circuit solver.

## Decision

Put the inference in a domain-agnostic core and the physics in plug-in instrument models.

The `InstrumentModel` Protocol lives in `engine/truehand/model.py`. It declares: `domain`,
`display_name`, `simulated`, `hypotheses`, `sites`, `reading` (a `ReadingSpec` with unit, minimum,
maximum, decimals), `default_sigma`, `default_class_tolerance`, `expected_readings()` (an F by K
array of predicted readings per hypothesis and site), `expected_reading()`, `hypothesis_index()`,
`instruction_phrase()`, `warning_phrase()`, `diagnosis_phrase()`, and `unresolved_phrase()`.

The core `Engine(model, config)` in `engine/truehand/engine.py` does the domain-independent work:
log-space belief update, placement posterior, retrospective `placement_audit`, expected information
gain by 20-point Gauss-Hermite quadrature (so the TypeScript port needs no RNG parity), union-find
distinguishability classes, and the resolution rule. The named thresholds live in
`engine/truehand/config.py`: `RESOLVE_THRESHOLD` 0.95, `PLACEMENT_WARNING_THRESHOLD` 0.5,
`MIN_USEFUL_GAIN_BITS` 1e-3, `MAX_STEPS` 12, `CLASS_TOLERANCE_VOLTS` 1e-3, `SIGMA_VOLTS` 0.02.

Domain 1, circuit (`domains/circuit.py`): exact, `simulated` false. Physics is modified nodal
analysis with the piecewise linear LED (ADR-0002).

Domain 2, thermometer (`domains/thermometer.py`): `simulated` true, labeled SIMULATED in the UI
and in `CatalogView` (ADR-0004). The physics is the exact series solution for transient conduction
in a sphere (Incropera et al., chapter 5). Eigenvalues are roots of 1 - zeta cot(zeta) = Bi, found
by bisection (30 steps). Parameters from Appendix A3: radius 0.06 m, thermal diffusivity
1.3e-7 m^2/s, conductivity 0.48 W/(m K), convection 12 W/(m^2 K) so that Bi = 1.5, oven 120 C,
initial 5 C, sensor sigma 0.5 C. Property sources are Incropera et al. and ASHRAE "Thermal Properties
of Foods". Seven doneness classes (cold center 40 C, rare 50, medium rare 55, medium 60, medium well
65, well done 70, overdone 75; the medium class note cites the USDA 62.8 C guideline). Six depth
sites at 0.5 to 5.5 cm.

Honest finding, to be shown and not hidden: a 2 cm slip cannot be detected from one reading,
because the profiles are shift-invariant. The engine recovers at step 2, and the retrospective
audit then reports that the first reading probably came from about 3.5 cm. The landing copy and
video shot 7 tell that story. The product does not show a fake first-step warning.

Scratch reconstruction on 2026-10-25, to be re-run inside `engine/`: the smallest adjacent-class
separation at each of the six sites is 2.96, 3.57, 4.11, 4.53, 4.83, and 4.98 C. In the demo case
(true class medium, told 5.5 cm, landed 3.5 cm, reading 65.65 C), the top class is medium well at
0.947 with P(off site) 0.009, so no warning fires. These are the plan's scratch values, not
measurements.

## Consequences

Positive:

- The same API (`/v1`), store, and UI serve both domains. The domain switch is a catalog change,
  not a code fork.
- The Protocol gives judges a concrete answer to "where else does it work": a new instrument is a
  new model class with its own tests, and the core is untouched.

Negative:

- The second domain is simulated. The claim that the core generalizes is a claim, and the UI and
  pitch must say so. A judge who sees the thermometer without the label would be right to object.
- The Protocol is a boundary that must stay small. Any circuit-specific logic that leaks into
  `engine.py` breaks the claim, so tests must run the core against both models.

What to re-visit:

- Re-base the circuit domain on handsight's `circuit.py` when Pankaj's code arrives. Confirm the
  catalog, the class count (32 here, 31 in the brief), and whether the Protocol needs a change.
- The thermometer stays simulated until a real probe measures real samples. That is a later
  evidence step, not a schedule item for the semifinal.
- If a test shows the Protocol cannot express a third instrument without changes to `engine.py`,
  reopen this decision before adding the third domain.

## Alternatives considered

- **Circuit only.** Rejected: it fails the impact criterion's generalization claim and reads as a
  single-trick demo.
- **A separate engine per instrument.** Rejected: it duplicates the inference code and doubles the
  parity burden (ADR-0006).
- **A general language model across domains.** Rejected: the CircuitSense result cited in the brief
  (section 3) shows frontier models perceive circuits well but fail at derivation, so the answer
  must come from the computation, not from the model.
- **Real thermometer measurements now.** Rejected for this window: no probe or sample set exists
  on the team, and collecting one is outside the finals timeline in the plan.
