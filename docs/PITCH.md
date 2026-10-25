# Truehand pitch: criteria map, scripts, judge Q&A, numbers policy

Date: 2026-10-25. Nexus Technology Cup 2026, College Track. Finals Dec 14-16, Nexus HQ, Baton Rouge.
Format confirmed by the dossier: 10 minutes presentation and demo, 5 minutes judge Q&A, prerecorded demo permitted.

Sources: `docs/brief/TRUEHAND_BUILD.md`, `docs/brief/Truehand_Scale_and_Build.md`,
`docs/brief/nexus-comp/Nexus_Technology_Cup_2026_Agent_Context.md`, the competition plan dated 2026-10-25.
Every number below is marked as a cited paper, a brief expectation, or a recorded result (a fixture or a file in `docs/results/`, labeled simulated where it is one). See section 7.

## 1. The four official criteria and our proof

Nexus published four named evaluation dimensions: Opportunity for impact, Degree of difficulty, Novelty, Feasibility.
No official weights, minimum score, rubric, or tie-break rules exist in the information session or any source
we reviewed. The "strong" and "weak" descriptors below are the dossier's advisory synthesis, not Nexus text.

**We never present a homemade scorecard as official.** The brief's section 9 scores (8.5 / 9.0 / 9.0 / 9.0)
and any "4.5 in all rubrics" target are internal decision aids. They do not appear on a slide, in the video,
or in an answer to a judge.

| Criterion | Official meaning (dossier) | Weak looks like | Strong looks like | Our in-repo proof |
|---|---|---|---|---|
| Opportunity for impact | Meets a need beyond the maker; could help large groups; credible impact opportunity, not a proven million-user market | "Everyone needs this", "AI will revolutionize the world" | "X user group faces Y bottleneck; here is our tested workflow on these examples" | Three studies with 51 blind participants between them, two peer reviewed and one arXiv preprint (CHI 2026, ASSETS 2024, arXiv 2602.18623); 4.28M working-age US adults with visual impairment, 52.3% employed vs 76.3% overall (NRTC, 2023 ACS); domain-agnostic core shown on two instruments (circuit exact, thermometer simulated and labeled); scale ladder in `docs/brief/Truehand_Scale_and_Build.md`; Louisiana Center for the Blind plan, date to be booked; honest PENDING badge on `/evidence` |
| Degree of difficulty | Genuinely hard engineering or research; not reproducible in two weeks with off-the-shelf tools | Ordinary API integration presented as a breakthrough | Diagram of the hard subsystem, baseline comparison, reproducible test, why the design is necessary | Circuit solver (MNA with piecewise-linear LED) inside the information-gain loop; joint inference over fault x placement; distinguishability classes by union-find; refusal rule with named thresholds; TypeScript port gated by a parity suite (<1e-6); stress tests (`mismatch.py`, `sweep.py`); all under `engine/` with pytest |
| Novelty | Meaningfully different from what exists; the team has done the search | "First ever", "nobody does this" without searching | Name three closest alternatives and what measurable problem each fails to solve | We name the three nearest relatives first (section 6) and state the delta in one sentence: they model sensor noise, we model actuator noise with a recoverable hidden state. Simulated, on identical readings, against our implementation of the published entropy method: 99.2% correct for truehand and 68.2% for the published method on 400 simulated faults (`docs/results/experiment_2026-10-25.md`) |
| Feasibility | Credible path forward; the awarded capital can advance the prototype | Unavailable datasets or unproven science behind a polished mockup | Demo works today, limits transparent, next $10,000 has identifiable technical uses | Deployed site anyone can open (`/sim?demo=worked-example`); replay from fixture never touches the network and never fails; hardware list is a breadboard, resistors, one LED, a 9 V battery and a meter; prize use is a measured confusion matrix, a second real instrument, and iOS (section 8) |

## 2. The 30-second explanation

> When a blind person measures a circuit, every existing tool assumes the probe landed where it was told.
> It did not always. Truehand is an assistant that infers the fault and the probe's real position at the
> same time, from the reading alone. So instead of confidently naming the wrong broken part, it can say
> "that number came from row 2, not row 3", ask for one more reading, and get it right. When two faults
> are electrically identical it says so and refuses to guess. It cannot tell you something it has not measured.

## 3. The 90-second core demo script

Runs from the fixture at `/sim?demo=worked-example&present=1`. Numbers on screen come from
`engine/fixtures/parity/worked_example.json` (git_sha d4731fc).

| Time | What the room sees | What we say |
|---|---|---|
| 0:00 | Breadboard scene, six rows, one LED. Side-by-side panel: Truehand left, Published method right. | "Same circuit, same meter, same hands. One resistor is ten times too small. Neither system knows which." |
| 0:10 | Instruction appears and is spoken: "Touch row 3." The probe trembles toward row 3. | "Both systems ask for row 3. This is what a blind hand does next." |
| 0:20 | Probe lands on row 2. Reading 3.671 V is entered. | "The hand lands one row off. The meter reads 3.671 volts. The reading is perfect. The row is wrong." |
| 0:30 | Right panel: published method, R2 shorted, 100% confident. | "The published method trusts the row. It is now certain R2 is shorted. It is wrong, and it is certain." |
| 0:40 | Left panel: Truehand, top candidate R3 shorted at 63.1% (fixture step 1), entropy still high. Warning banner, spoken: "That reading did not come from row 3. It most likely came from row 2." | "Truehand does not trust the row. The reading itself says where the probe really was. It warns, and it asks again." |
| 0:55 | Second instruction, second reading 0.338 V. | "Second reading, 0.338 volts." |
| 1:05 | Left panel resolves: R3 ten times too small, 97.5% (fixture step 2). Plumb line settles over R3. Spoken diagnosis. | "R3 is ten times too small. Correct. Two readings, one warning, no guessing." |
| 1:20 | Switch to the unresolved fixture: LED open vs LED reversed. Status "unresolved", spoken refusal. | "And when two faults are electrically identical, it says so. It refuses. That is a feature." |
| 1:30 | End frame. | "It cannot tell you something it has not measured." |

## 4. The 10-minute finals plan

Mapped to the dossier's suggested blueprint (marked NOT official by the dossier; we use it as a shape).

| Dossier window | Dossier purpose | Our content |
|---|---|---|
| 00:00-01:00 | Problem and user, with proof | Play a short AI description that is confidently wrong. "How would you know?" Participant 23 (ASSETS 2024): "sometimes I wonder whether or not the inaccuracy is really more my picture taking skills." A sighted person resolves that by looking. She cannot. EEVblog 2014: "He can't see the probes." The display was solved; the probe was never solved. |
| 01:00-02:00 | What is genuinely new | Name Gao 2014, POMDP diagnosis 2019, de Kleer and Williams first. They model the test outcome as noisy. We model which test ran at all. The six-line math on one slide. "Probe position is recoverable exactly as far as it matters, and no further." |
| 02:00-06:30 | Demonstrate functioning technology | The 90-second core demo (section 3), live if the room allows, from the recorded run otherwise. Then the real breadboard: blindfold, told row 3, deliberate landing on row 2, the warning fires out loud. Then the thermometer domain, badge SIMULATED on screen, the step-2 recovery and the retrospective audit. Then the live simulator with a judge-chosen fault and seed. |
| 06:30-08:00 | Architecture and the hard engineering | One diagram: instrument model (solver) feeds expected readings into a joint posterior over fault and placement; information gain picks the next row; placement posterior drives the warning; union-find classes drive refusal. Python engine is the source of truth; TypeScript port is parity-gated; replay never needs the network. What each of us built. |
| 08:00-09:00 | Test evidence and closest alternatives | The five-method comparison (truehand and four baselines) from `docs/results/stability_2026-10-25.md`, five seeds, labeled simulated and preliminary, with the command on the slide. The sweep figure: the conclusion holds across p_same 0.60 to 1.00. Warning precision. The LLM transcript, dated, as an exhibit, not a benchmark. |
| 09:00-10:00 | Feasibility, limits, next milestone, prize use | The honest weaknesses (section 5, question 4 and the list at the top). The Louisiana Center: about 30 students at a time, industrial arts two hours a day, 35 miles from campus (planning notes, `docs/EVIDENCE.md` section 4). The prize-use paragraph (section 8). Close: "It cannot tell you something it has not measured." |

Q&A (5 minutes): the eight questions in section 5, rehearsed twice in Sprint 5.

## 5. The eight likely judge questions and our answers

The dossier lists eight "uncomfortable judge questions." We state our weaknesses before a judge finds them.
From the brief's section 10, in this order:

1. No blind person has used this yet. Everything human in our evidence is someone else's published interview. The Louisiana Center visit is the only thing that fills this hole, and it is planned, not done.
2. The confusion model is assumed (0.78 / 0.08 / 0.03). Mitigated by the sweep, not eliminated.
3. Single faults only. Two simultaneous faults break the enumerable hypothesis space.
4. DC and resistive only. No AC, no transients, no op amps, no microcontrollers. The wedge is deliberately narrow.
5. The baseline is our implementation of the published method. It is a fair one-variable ablation, but we implemented both sides.
6. The market is small if we stay in electronics. The generalization to other instruments is a claim shown in simulation, not a measured result.

And the one result that could kill the idea: if blind users at the Louisiana Center place probes with p above 0.95, the published method is already fine and our contribution evaporates. We say this out loud because it is the experiment worth running first.

| # | Judge question | Our answer |
|---|---|---|
| 1 | What did you actually build? | A Python inference engine in `engine/`: a circuit solver (modified nodal analysis, piecewise-linear LED), a 33-hypothesis fault catalog, a joint Bayesian update over fault and probe placement, expected-information-gain instruction selection by Gauss-Hermite quadrature, a placement warning, and a refusal rule over distinguishability classes. A FastAPI wrapper. A web simulator with a 3D scene for sighted viewers and a text and voice channel for the blind user. Separately labeled: the thermometer domain is a simulated heat model; the LLM comparison is a recorded transcript; the confusion matrix is assumed until measured. Third-party: Web Speech API for voice, Render for hosting. Not built: accounts, database, cloud infrastructure. |
| 2 | What is new? | Three nearest relatives: Gao et al. 2014 (entropy-based test-point selection for analog fault diagnosis), sequential diagnosis with unreliable tests including a POMDP treatment (IEEE 2019), and model-based diagnosis after de Kleer and Williams. All three model uncertainty in the outcome of a test. None models uncertainty in which test ran. We do: the person is a noisy actuator, the hand lands on the wrong node, and because different nodes carry different voltages the reading carries the signature of the node actually touched. They model sensor noise; we model actuator noise with a recoverable hidden state. The accessibility constraint is what creates the research problem; for a sighted user the hand is not noisy, so the problem never appears. |
| 3 | Why is this difficult? | The likelihood marginalizes over where the hand might be, so the circuit solver sits inside the information-gain loop and runs for every fault, every row, every candidate instruction. Getting V_f(l) right for 33 faults including a nonlinear LED is where the work is. A simple baseline cannot reach the same result because it interprets the reading as though it came from the instructed row; our worked example shows it reach 100% confidence on the wrong fault (`R2_short`) from one reading (`worked_example.json`, step 1). Refusal requires knowing which fault classes are electrically identical, which is a property of the solver output, not a heuristic. |
| 4 | How do you know it works? | `uv run --project engine python -m truehand.experiments.experiment 400` and `stability.py` write `docs/results/` with the command, git SHA and seeds. Five methods on identical faults, meter and hands. Metrics: correct, confidently wrong (at least 0.9 on a wrong class), unresolved rate, mean steps, warnings issued and correct. Failure cases are in the same files: the unresolved pair, the near pair R7 short vs R7 10x low (45 mV apart at one row), and the thermometer's undetectable first-step slip. Our simulated five-seed run (`docs/results/stability_2026-10-25.md`; simulated, preliminary, not peer reviewed): truehand 99.5 ± 0.4% correct and 0.5 ± 0.4% confidently wrong; the published method 72.3 ± 2.6% and 27.7 ± 2.6%. The brief's 99.0% and 21x were expectations from the original run; they are not our claim, and we show our run's numbers. |
| 5 | Who needs it? | Blind and low-vision students and technicians working on breadboards first. Evidence of the painful workflow: TangibleCircuits (CHI 2020) measured 27% error identification with conventional tutorials and quotes "debugging is near impossible"; EEVblog 2014 shows a blind engineer counting pins by feel; "Say It My Way" (CHI 2026) shows a blind user inventing sequential testing by hand to make an AI answer trustworthy. Scale: 4.28M working-age US adults with visual impairment, 52.3% employed vs 76.3% overall (NRTC). Buyers on the ladder: vocational rehabilitation agencies, schools for the blind, instrument makers, then anyone who works where they cannot look. |
| 6 | Can it scale? | Architecturally: the core is domain-agnostic; an instrument model supplies hypotheses, sites and expected readings, and the engine does the rest. We show a second domain in simulation (thermometer). Limits we know: single-fault enumeration grows with the catalog; the thermometer's profiles are shift-invariant so a slip is only caught at step 2; the current confusion model is one row wide. Operationally: the engine is NumPy on a free web service; the TypeScript port runs the demo offline. We have no traction numbers and do not invent any. |
| 7 | What will prize money change? | See section 8. Measured confusion matrix at the Louisiana Center (travel, participant thank-yous, a protocol sheet), a second real instrument (a Bluetooth multimeter or a real probe thermometer), the iOS build through Capacitor with VoiceOver testing, and blind-user fault-finding sessions with recorded success rate and time. Each item has a file it changes in this repo. |
| 8 | Can you repeat this demo? | Yes, deterministically. The worked example replays from `engine/fixtures/parity/worked_example.json` with no network. Setup: open the deployed URL, or `pnpm dev` and `pnpm api`. Dependencies are pinned in lockfiles. Fallback: the recorded video (`docs/VIDEO_STORYBOARD.md`). Recovery: if the API is asleep the UI says so and runs replay; if WebGL is unavailable the text channel runs the whole flow. `/verify` and `/demo-worked-example` are the commands we run before every demo. |

## 6. Nearest prior art

Say these first. A judge with a diagnostics background will know them.

| Relative | What it does | What it does not do |
|---|---|---|
| Gao et al., "Entropy based test point selection for analog circuit fault diagnosis", Mathematical Problems in Engineering, 2014 | Picks the next test point by information gain over a fault dictionary | Assumes the test point you asked for is the one measured |
| Sequential diagnosis with imperfect or unreliable tests, including a POMDP treatment, IEEE 2019 | Treats each test as a black box with false positive and false negative rates | Noise is on the outcome; the identity of the executed test is never in doubt |
| de Kleer and Williams, model-based diagnosis, 1980s | Diagnoses from a model of correct behavior and observed discrepancies | Observations are attributed to the intended probe location |

The one-sentence difference: **they model sensor noise; we model actuator noise with a recoverable hidden state.**

We did not invent information-gain test selection and we say so. The claim is the joint posterior over fault and
placement, the warning it yields, and the refusal rule, evaluated against the published method on identical readings.
A prior-art search by someone outside the team is PENDING (see `docs/EVIDENCE.md`).

## 7. Numbers policy

- Every figure shown to anyone traces to a file in `docs/results/` (with command, git SHA and seeds), a fixture in `engine/fixtures/parity/`, or a DOI or paper cited by name.
- The brief's headline numbers, 99.0% correct, 21x fewer confidently wrong diagnoses, and 176 of 178 warnings correct, are **expectations** from the teammate's original `handsight` run. They are not our claim and appear nowhere on a slide or in the video as ours. Our run of the same comparison is in `docs/results/stability_2026-10-25.md` (truehand 99.5% correct, 526 of 531 warnings on real slips; labeled simulated and preliminary).
- The brief's worked-example numbers (63.5%, 97.6%, 100.0%) are also expectations. The recorded `worked_example.json` (git_sha d4731fc) gives 63.1%, 97.5% and 100.0%, and the engine computes 32 distinguishable classes where the brief said 31 (`engine/tests/test_circuit.py`). The fixture's numbers are the ones we show, labeled with the fixture name.
- Anything simulated is labeled "simulated" in the UI, on the slide, and in speech. The thermometer domain is simulated. The noisy hand in simulate mode is simulated.
- Customer validation is **PENDING**. We have not put this in front of a blind user. The Louisiana Center for the Blind is the planned partner; permission to name it is on file (2026-10-25). The protocol is 8 participants x 20 placements. We show the plan with a PENDING badge and no date until one is booked, not a result.
- The LLM comparison is a dated, recorded transcript shown as an exhibit. It is not a benchmark and we do not report a percentage from it. CircuitSense (arXiv 2509.22339) is the published benchmark we cite for frontier-model circuit reasoning: Gemini-2.5-Pro 19.06%, Claude-Sonnet-4 6.29%, GPT-4o 4.98% derivation accuracy.
- The internal criterion scores in the brief are never shown.

## 8. What the prize changes

The next $10,000 has four technical uses, each with a file it changes. First, the measured confusion matrix: one afternoon at the Louisiana Center for the Blind, eight participants, twenty placements each, which replaces `Config.confusion` and turns "we assumed 0.78" into "we measured it with the Louisiana Center." Nobody has published a tactile probe-placement confusion matrix for blind users; the dataset is a contribution on its own. Second, a second real instrument: a Bluetooth multimeter that streams readings removes speech errors, and a real probe thermometer turns the simulated domain into a measured one. Third, iOS: a Capacitor wrapper around the existing web app, a native speech adapter, a VoiceOver pass and a TestFlight build, so a blind user can run this from the phone in their pocket. Fourth, blind-user fault-finding sessions with recorded success rate, time and quotes, which is the one thing that moves feasibility from "it runs" to "a blind person has used it."
