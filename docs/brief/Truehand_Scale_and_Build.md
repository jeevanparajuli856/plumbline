# Plumbline: how it scales beyond electronics, and what to build (Oct 25, 2026)

## Reframe: the engine is not "circuits for blind students"
Plumbline's core idea: **the person holding the tool is a noisy actuator.** Every measuring tool and AI assumes the sensor is where the user thinks it is. Plumbline infers *where the sensor really was* from the reading itself, then corrects, re-asks or refuses to guess. Electronics is the first wedge because the physics is exact (circuit solver).

**Category:** *trustworthy measurement for people who can't see where their tool is.* That includes blind people, and, through the curb-cut effect, anyone working where they can't look.

## Scale ladder
| Stage | User | What the engine infers | Who pays |
|---|---|---|---|
| 1. Wedge (now) | Blind/low-vision students and technicians on breadboards | Fault + true probe row | Vocational rehabilitation agencies (Louisiana Rehabilitation Services), schools for the blind, college disability offices; APH (American Printing House for the Blind) as distributor [verify APH Federal Quota funding] |
| 2. Any talking instrument | Blind people at work and at home: pH meters and scales in chem/bio labs, calipers in machining, kitchen probe thermometers | Is the probe in the right place/depth? Is the reading trustworthy? | Instrument makers via SDK licence; VR agencies; employers (job accommodation) |
| 3. Curb-cut: sighted people who can't look | Auto techs back-probing connectors behind dashboards, HVAC/field techs, STEM lab students, remote-guided repair | Same math: which pin/point was actually touched | Tool makers (Fluke, Snap-on-class), technical schools, field-service software |
| 4. Health (big swing) | Families doing home telehealth exams; novices placing a stethoscope or other sensor on the body | Where on the body the sensor really is, from the signal itself | Telehealth kit makers, payers [proven category: AI probe-placement guidance (e.g., ultrasound guidance acquired by GE) — verify] |

**Why the market is bigger than it looks**
- **4.28M working-age US adults have visual impairments, and only 52.3% are employed,** against 76.3% overall (2023 ACS, analyzed by NRTC, Mississippi State). Hands-on technical jobs are a big part of that gap.
- Don't use the "70% unemployed" myth; NRTC calls it inaccurate.
- About 7.7M Americans have a visual disability (NFB, 2016 data).

## What to build before Tue Oct 27 (application)
1. **Stress tests that kill the "circular" critique.** Keep Plumbline's hand model fixed and simulate *different* true behavior: lopsided slips, jumps of 3+ rows, poor contact, bridging two rows. Report everything.
2. **Stronger baselines:** "re-measure until two readings agree," plus a real LLM run (Claude/GPT) on the same netlist and readings. Report measured numbers only.
3. **Voice loop.** Web Speech API, so the user hears "touch row 3" and speaks the reading. Optional: a **Bluetooth multimeter** (e.g., an OWON B35T-class meter) that streams readings automatically, which removes speech errors and is more impressive.
4. **Real breadboard** matching `circuit.py` (9V battery, LED, resistors).
5. **Generalization proof (this answers "it's only for EE students").** Refactor the engine into a **domain-agnostic core plus plug-in "physics models"**, then show a second domain running:
   - **Easiest honest option:** a second, larger circuit plus one non-circuit model in simulation, e.g., a kitchen probe thermometer, where a heat model of the meat infers probe depth, so "your probe is in the fat, not the center."
   - Label it simulation for now; aim for a real second instrument by the finals.
6. **Video.** A blindfolded run, then a deliberate one-row slip, and the warning fires. Then the screen-recorded experiment. Then a slide showing the scale ladder.
7. **Email the Louisiana Center for the Blind (Ruston)** today to book a session for hand-accuracy data.

## Before the finals (Dec 14-16)
- **Real hand-accuracy data:** 8 blind participants × 20 placements = 160 points. Nobody has published this before.
- Re-run the experiments with the measured numbers.
- Real fault-finding sessions with blind users: success rate, time taken, quotes.
- A letter of support from an instructor or rehab professional.
- A real second instrument.
- One pilot conversation with a vocational rehabilitation agency, the buyer.

## Note
The code (`handsight`) is not on this machine yet. Get it from your teammate (Pankaj) before planning the build split.

Sources: [NRTC employment statistics](https://www.blind.msstate.edu/sites/www.blind.msstate.edu/files/2024-12/Employment%20Statistics%20for%20Adults%20with%20Visual%20Impairments.pdf), [NRTC on the unemployment myth](https://blind.msstate.edu/news/2024/12/debunking-myth-resources-unemployment-rate-people-visual-impairments), [AFB employment statistics](https://afb.org/research-and-initiatives/statistics/employment-bvi), [NFB statistics](https://nfb.org/node/3757)
