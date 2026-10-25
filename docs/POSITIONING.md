# Truehand positioning and landing-page direction

Owner: the web-shell and landing lanes. Read this before writing any copy or layout. The
`ui-designer` agent enforces it. Mockups that show the intended look: the "Truehand UI
Mockups" design canvas (three boards: landing, simulator, phone text channel).

## 1. Frame: a company with a product, not a competition entry

Truehand presents itself the way a research-backed robotics or instrument company does:
the research first, then the technology, then an honest validation status, then "product
coming" with something you can use today. The Nexus Technology Cup is never mentioned on the
site. The team and the university appear in the team row and the footer, not in the hero.

One-line category: **trustworthy measurement for hands that cannot see the tool.**

Status line, used verbatim wherever status is shown:
**"Simulation validated. User validation in progress."**

Product line: **"Web simulator open now. iOS app next."**

## 1.1 Name, mark and contact (ADR-0013)

Name: **Truehand**. Domain truehand.tech. Contact: **support@truehand.tech** (pilots, partnerships, support).

The idea the mark is built on, and the sentence to use when someone asks: **a braille cell and a breadboard are the same shape.** Both are grids of dots, read by fingertip, where every hole feels identical to the one beside it. The mark is a six-dot cell with one dot ringed in red: the hole the probe actually found. Say "Truehand works out which hole your probe actually found", never "knows": it infers from readings and says so when it cannot tell.

Brand files: `apps/web/public/brand/` (press kit SVGs and PNGs, the social card). The red of the found dot is the mark's alone; it never signals a UI state.

## 2. Landing sections, in order, with the job of each

| #   | Section id   | Job                                                                                                          | Copy anchors                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | `mast`       | State the category and the one promise; two exits                                                            | Eyebrow "Research preview. Trustworthy measurement for hands that cannot see the tool". H1 "Measurement you can trust without looking." Status, Product, Built-at triplet under the lead. Buttons "Play the worked example", "Open the simulator"                                                                                                            |
| 1   | `research`   | Show the evidence base like a company shows its papers                                                       | Three study cards (CHI 2026 UMD "Say It My Way"; ASSETS 2024 Michigan "Misfitting With AI"; arXiv 2602.18623 Stony Brook) with one quote each; a prior-art strip (Gao 2014; IEEE 2019 sequential diagnosis; de Kleer and Williams 1987) and the one-sentence difference: "those model sensor noise, we model actuator noise with a recoverable hidden state" |
| 2   | `problem`    | Make the hand, not the meter, the unsolved problem                                                           | EEVblog quote "He can't see the probes"; "the display was solved, the probe was never solved"                                                                                                                                                                                                                                                                |
| 3   | `play`       | The technology: the worked example (told row 3, lands row 2, two readings), Truehand vs the published method | Eyebrow "The technology". Six-step transcript always in the DOM. Play runs the real replay fixture                                                                                                                                                                                                                                                           |
| 4   | `how`        | Six lines of math, not a black box                                                                           | Each line with a plain-English gloss                                                                                                                                                                                                                                                                                                                         |
| 5   | `generalize` | The engine is domain-agnostic                                                                                | Roast thermometer, SIMULATED badge, the honest step-2 recovery story                                                                                                                                                                                                                                                                                         |
| 6   | `ladder`     | Who it is for and who pays                                                                                   | Four rungs from docs/brief/Plumbline_Scale_and_Build.md                                                                                                                                                                                                                                                                                                      |
| 7   | `evidence`   | Validation status as a roadmap                                                                               | Eyebrow "Validation status". H2 is the status line. Phase chips: 1 Research, 2 Engine, 3 Simulation, 4 User validation (now), 5 Pilot, 6 Product. Evidence table from docs/EVIDENCE.md with DONE / IN PROGRESS / SIMULATED / PENDING. Team row with advisor placeholder                                                                                      |
| 8   | `close`      | The promise and the exits                                                                                    | "It cannot tell you something it has not measured."                                                                                                                                                                                                                                                                                                          |

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

## 4. Visual direction (chosen 2026-10-25 evening: warm beige, editorial, live instrument)

Reference board: "B2" in the design canvas "Plumbline UI Directions". Implementation prompt: docs/HANDOFF_UI.md.

### 4.1 Palette and type

- Light default. Page #F3EDE3, cards #FBF8F2 with a 1px #DCD2C2 border, bands #EBE2D3, ink sections #1E1A16 with #F3EDE3 text. Text #1E1A16, muted #5E554B. Measured amber: text #9A4A0C, fill #F2A93B; primary action #B95A0F. Inferred (told site, plumb line) #0B6478. Warning #B02C17 on #FBEEE8, used only for placement warnings, always with the left rule, the glyph and the word. Dark and high-contrast themes derive from the same tokens.
- Type: Fraunces (display, variable, optical sizes) for headlines and big numbers; Atkinson Hyperlegible Next for everything else (designed by the Braille Institute for low vision, which is part of the story); JetBrains Mono for readings, probabilities, captions and status tags. Display 84, h2 48 to 52, lead 21, body 17 to 18, captions 13 to 15. Nothing below 13px, nothing below 4.5:1.
- Shape: sharp sections and tables, 12px cards, 8px buttons, 24px phone frame. Shadows only on the hero instrument card and the phone.

### 4.2 Layout

Asymmetric by rule: 7:5 hero with the live instrument card, 2:3 research with a pinned left column and an offset numbered quote list, full-bleed ink technology section 5:7, 3:2 product with an offset three-row list and the phone card, 2:3 validation with a ruled four-cell stat grid, 7:5 CTA band. A thin column of identical holes pinned at the right page edge follows scroll, its ringed dot sliding to the reader's place (the mark, read vertically). One 72px header: wordmark, four links, one theme button that opens the Display popover (Theme radiogroup, Text only, Reduce motion), one ink "Open the simulator" button.

### 4.2.1 Photography (added 2026-10-25 at the user's request)

Five free Unsplash photos (hands on a braille display, a multimeter with probes, a wired breadboard, braille dots in numbered rows, an empty breadboard), manifest `apps/web/src/landing/photos.ts`, credits `docs/IMAGE_CREDITS.md`. They add texture to research, problem, technology and product; they never appear in the hero, never stand in for our users, study, partner or hardware, and each carries a visible "Stock photo" credit. Shape: sharp edges or 12px when inside a card, no filters, no gradient overlays, no duotone glow; warm grading only through the page around them.

### 4.3 Banned (the twenty tropes, from the user's anti-slop playbook)

Generic line-icon libraries; emoji in headings or badges; glass and blur; em-dashes; the Inter, Geist or Space Grotesk stack as the brand type; three equal cards in a row; bento grids; glowing or gradient borders; fake terminal windows; "It's not X, it's Y" headlines; placeholder mockups; dark mode with purple; radial orbs and blobs; dot grids and mesh backgrounds; sparkle icons; animated CTA arrows; uniform hover elevation; rainbow card borders; pill badges above the hero; vague buzzwords. Also: uniform 12 to 16px radius everywhere, floating 3D clay shapes, low-contrast grey text, and the template page rhythm (hero, logo ticker, three cards, bento, testimonials, pricing, FAQ, dark footer).

### 4.4 Motion

The page is the instrument. The hero card runs the real engine on recorded fixtures in a loop with a Pause control; the headline rises word by word; research quotes type in; the technology section pins and scrubs the two-method belief race; product rows stagger in; validation stats count up once; the edge plumb line follows scroll and its swing follows the landing progress. GSAP ScrollTrigger drives the DOM; the 3D camera keeps its own pose function. Every animation snaps to its final state under reduced motion (OS setting or the in-page switch) and has a DOM text twin. Transform and opacity only. Nothing near 3 Hz.

## 5. The simulator (`/sim`) must read as an instrument

- The instruction is the dominant element ("Touch the red probe to row 3."), 34px.
- Warning banner is `role="alert"`, left vermilion rule, 22px sentence, then the likely row.
- Reading input is mono 26px with an explicit label "Meter reading in volts" and the T shortcut.
- Side by side: Truehand belief bars (cyan) and the published-method bar (dashed neutral).
- Placement strip: told row dashed cyan, likely row filled amber, with percentages in text.
- Reading log is a real table. Landed row is hidden until the reading is accepted.
- Header: instrument switch (Circuit / Thermometer "simulated"), mode switch
  (Simulate / Live meter / Replay), Speech on/off (off by default), Text only, shortcuts.
