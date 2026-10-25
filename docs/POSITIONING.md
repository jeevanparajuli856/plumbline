# Plumbline positioning and landing-page direction

Owner: the web-shell and landing lanes. Read this before writing any copy or layout. The
`ui-designer` agent enforces it. Mockups that show the intended look: the "Plumbline UI
Mockups" design canvas (three boards: landing, simulator, phone text channel).

## 1. Frame: a company with a product, not a competition entry

Plumbline presents itself the way a research-backed robotics or instrument company does:
the research first, then the technology, then an honest validation status, then "product
coming" with something you can use today. The Nexus Technology Cup is never mentioned on the
site. The team and the university appear in the team row and the footer, not in the hero.

One-line category: **trustworthy measurement for hands that cannot see the tool.**

Status line, used verbatim wherever status is shown:
**"Simulation validated. User validation in progress."**

Product line: **"Web simulator open now. iOS app next."**

## 2. Landing sections, in order, with the job of each

| # | Section id | Job | Copy anchors |
|---|---|---|---|
| 0 | `mast` | State the category and the one promise; two exits | Eyebrow "Research preview. Trustworthy measurement for hands that cannot see the tool". H1 "Measurement you can trust without looking." Status, Product, Built-at triplet under the lead. Buttons "Play the 20-second example", "Open the simulator" |
| 1 | `research` | Show the evidence base like a company shows its papers | Three study cards (CHI 2026 UMD "Say It My Way"; ASSETS 2024 Michigan "Misfitting With AI"; arXiv 2602.18623 Stony Brook) with one quote each; a prior-art strip (Gao 2014; IEEE 2019 sequential diagnosis; de Kleer and Williams 1987) and the one-sentence difference: "those model sensor noise, we model actuator noise with a recoverable hidden state" |
| 2 | `problem` | Make the hand, not the meter, the unsolved problem | EEVblog quote "He can't see the probes"; "the display was solved, the probe was never solved" |
| 3 | `play` | The technology: the 20-second worked example, Plumbline vs the published method | Eyebrow "The technology". Six-step transcript always in the DOM. Play runs the real replay fixture |
| 4 | `how` | Six lines of math, not a black box | Each line with a plain-English gloss |
| 5 | `generalize` | The engine is domain-agnostic | Roast thermometer, SIMULATED badge, the honest step-2 recovery story |
| 6 | `ladder` | Who it is for and who pays | Four rungs from docs/brief/Plumbline_Scale_and_Build.md |
| 7 | `evidence` | Validation status as a roadmap | Eyebrow "Validation status". H2 is the status line. Phase chips: 1 Research, 2 Engine, 3 Simulation, 4 User validation (now), 5 Pilot, 6 Product. Evidence table from docs/EVIDENCE.md with DONE / IN PROGRESS / SIMULATED / PENDING. Team row with advisor placeholder |
| 8 | `close` | The promise and the exits | "It cannot tell you something it has not measured." |

## 3. Copy rules

- Present tense, first person plural, plain words. No hype adjectives ("revolutionary",
  "game-changing", "seamless"), no exclamation marks, no emoji.
- Every number is one of: a cited paper (name the venue and year), our own run (name the
  command and date), or labeled "simulated". The brief's 99.0% / 21x are expectations until
  `stability.py` runs here; they do not appear on the site until then.
- "User validation in progress" is true only while a Louisiana Center for the Blind session
  is being scheduled or has happened. It never becomes "validated" without data in
  `docs/results/`.
- Never claim "first ever". Say "the first assistant that infers the fault and the probe's
  true position from each reading", which is specific and defensible after the prior-art
  search in docs/PITCH.md.
- The refusal is a feature: say "it refuses to guess when the physics cannot tell two faults
  apart" on the landing.
- Blind readers are the primary users of the simulator; sighted judges and buyers are the
  primary readers of the landing. Both get the same words: nothing informational is only in
  the 3D scene.

## 4. Visual direction (light default, low-vision friendly)

- Light theme is the default: paper `#F6F3EC`, ink `#15181C`, panels `#FFFFFF` with a
  `#CFC9BD` hairline. Dark and high-contrast themes derive from the same tokens.
- Measured = amber (fill `#F2A93B`, text `#8A5200`). Inferred = cyan (fill `#5FD3E8`, text
  `#0B6478`). Warning `#B02C17`, used only for placement warnings, always with a left rule, a
  glyph and the word "Warning".
- Type: IBM Plex Sans (UI) and JetBrains Mono (readings, probabilities, row labels, captions).
  Base body 18px on the simulator, 20 to 22px lead on the landing, display 68px. Tabular numerals.
- Layout: left-aligned editorial grid (12 columns, 24px gutters, 64px margins). No centered
  hero, no gradient blobs, no card grids of identical cards, no stock illustrations, no
  "Get Started" buttons, no generic SaaS dashboard chrome.
- Motion communicates state only (reading accepted, belief shifting, warning, settling).
  Reduced motion snaps. Nothing faster than 3 Hz.
- Every section carries a static mono caption that is the DOM twin of the scene.

## 5. The simulator (`/sim`) must read as an instrument

- The instruction is the dominant element ("Touch the red probe to row 3."), 34px.
- Warning banner is `role="alert"`, left vermilion rule, 22px sentence, then the likely row.
- Reading input is mono 26px with an explicit label "Meter reading in volts" and the T shortcut.
- Side by side: Plumbline belief bars (cyan) and the published-method bar (dashed neutral).
- Placement strip: told row dashed cyan, likely row filled amber, with percentages in text.
- Reading log is a real table. Landed row is hidden until the reading is accepted.
- Header: instrument switch (Circuit / Thermometer "simulated"), mode switch
  (Simulate / Live meter / Replay), Speech on/off (off by default), Text only, shortcuts.
