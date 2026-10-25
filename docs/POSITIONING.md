# Truehand positioning and landing-page direction

Owner: the web-shell and landing lanes. Read this before writing any copy or layout. The
`ui-designer` agent enforces it. Mockups that show the intended look: the "Truehand UI
Mockups" design canvas (three boards: landing, simulator, phone text channel).

## 1. Frame: a company with a product (revised 2026-10-25, ADR-0014)

Truehand presents itself as a company with a product people can use today, in a business tone:
the outcome first, who it is for, the product, then proof. It is not a research poster and not a
competition entry. The Nexus Technology Cup is never mentioned on the site. Founder names and the
university appear on `/about` only (team section), never in the header, footer, home page or
evidence page.

One-line category: **trustworthy measurement for hands that cannot see the tool.**

**Product first (user direction, 2026-10-25).** Every page sells a finished-feeling product: what
it does for the person holding the probe, shown working. Validation talk ("in progress",
"preliminary", phases) never leads and never appears on Home, How it works, The app or
Accessibility. It lives on Evidence only. Honesty still holds: no claim of user validation, real-hand
accuracy, customers or availability we do not have; any number shown is labeled simulated in small
type next to it.

Status line, used verbatim and only on the Evidence page:
**"Simulation validated. User validation in progress."**

Product line, used verbatim wherever the product is named:
**"Truehand for iPhone and the web. Try the web app today."**

The product is the Truehand app, on iPhone and on the web. It is the solution itself: it tells the
user where to probe, takes the reading, warns when the probe landed somewhere else, and names the
fault or says it cannot tell. Simulation is one mode inside the app (alongside a live meter and
recorded replays), used for demos and validation; it is never the product's name. Never call the
web app "the simulator" in copy. Primary call to action: **"Try Truehand"** (opens the web app).

## 1.1 Name, mark and contact (ADR-0013)

Name: **Truehand**. Domain truehand.tech. Contact: **support@truehand.tech** (pilots, partnerships, support).

The idea the mark is built on, and the sentence to use when someone asks: **a braille cell and a breadboard are the same shape.** Both are grids of dots, read by fingertip, where every hole feels identical to the one beside it. The mark is a six-dot cell with one dot ringed in red: the hole the probe actually found. Say "Truehand works out which hole your probe actually found", never "knows": it infers from readings and says so when it cannot tell.

Brand files: `apps/web/public/brand/` (press kit SVGs and PNGs, the social card). The red of the found dot is the mark's alone; it never signals a UI state.

## 2. Site map: five pages, each short (replaces the one-page scroll landing, ADR-0014)

Header: wordmark (mark + "Truehand", no tag), links **How it works** (`/how-it-works`), **Evidence**
(`/evidence`), **The app** (`/app`), **Accessibility** (`/accessibility`), one theme toggle, and the ink **"Demo"** button (`/sim`, the web app). Footer: "Truehand.", "Not a safety device.",
support@truehand.tech, About. No names, no university, no "research preview".

| Page          | Path             | Job                                                    | Sections (ids, each with `${id}-title`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home          | `/`              | Promise, proof, one action; under four screens at 1440 | `hero` (product showcase: H1 "Measurement you can trust without looking.", one-sentence lead on what the app does, the product line, "Try Truehand" and "See how it works"; on the right the Truehand app running live on the iPhone device (the same recorded loop as the instrument card, shown as the real app screen); no status line), `problem` (the hand, not the meter, is the unsolved problem; the EEVblog forum quote "He can't see the probes"), `outcomes` (what changes for the user: told where to probe, warned when the probe slipped, never given a guess), `proof` (a confident results strip: two or three numbers with a small "simulated" label, linking to Evidence; no "in progress" wording), `audience` (who it is for and who buys it, from the scale ladder, generic roles only), `cta` (ink band: the promise "It cannot tell you something it has not measured.", "Try Truehand", pilot contact) |
| How it works  | `/how-it-works`  | Show the experience, not the method                    | `intro`, `play` (the worked example: told row 3, the hand lands on row 2, two readings; Truehand vs a conventional assistant on the same readings; the "Play the worked example", "Pause", "Replay" buttons and the "Worked example, step by step" list), `refusal` (it refuses to guess when two faults look identical), `domains` (the same engine on a thermometer, SIMULATED badge)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Evidence      | `/evidence`      | Why it matters and how far validation has come         | `research` (three studies with one quote each), `results` (validation stats grid, labeled simulated, with run date), `scope` (what is simulated and what is not yet measured, plus the one line that the field session with blind participants at the Louisiana Center for the Blind is set for November 11, 2026)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| The app       | `/app`           | The product: what the user does and what they get      | `app` (product line as H1 subtitle, iPhone and web), `modes` (live meter, recorded replays, simulation for practice and demos), `phone` (the phone preview with "Next recorded reading"), `buyers` (schools and programs, employers, the pilot), `cta`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Accessibility | `/accessibility` | Our commitment and the controls                        | `commitment` (screen reader first, voice optional, keyboard throughout, no information only in visuals), `settings` (the real controls: radiogroup "Theme" System, Light, Dark, High contrast; switch "Text only"; switch "Reduce motion"), `support` (how to report a barrier: support@truehand.tech)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

The 3D scene appears only on How it works (behind the worked example). The edge cell column
appears on Home, How it works and The app. `/about` keeps the team, the university and the
partner sentence.

## 3. Copy rules

- **Never disclose the method on the site** (ADR-0014). No formulas, no probability model, no hand
  model numbers (e.g. 0.78 / 0.08 / 0.03), no thresholds, no "information gain", no description of
  how belief or placement is computed, no prior-art comparison that names our modelling idea, no
  engine internals (file paths, test names, reference voltages, commands, commit hashes). Say what
  it does ("it works out where the probe actually landed from each reading"), never how. The method
  lives in the repo, the pitch and the judges' Q&A, not on the public site.
- Provenance on the site is a short label: "Simulated, 1,500 runs, October 2026". The trace from
  each number to its file is enforced by tests (`content.test.ts`) and documented in docs/EVIDENCE.md.
- Business tone: outcomes for the user and the buyer, plain verbs, short paragraphs. No academic
  hedging on every line ("Preliminary. Not peer reviewed." appears once, on Evidence, next to results).

- Present tense, first person plural, plain words. No hype adjectives ("revolutionary",
  "game-changing", "seamless"), no exclamation marks, no emoji.
- Every number is one of: a cited paper (name the venue and year), our own run (name the
  command and date), or labeled "simulated". The brief's 99.0% / 21x are expectations until
  `stability.py` runs here; they do not appear on the site until then.
- "User validation in progress" is true while the Louisiana Center for the Blind field session is
  booked (November 11, 2026) or has happened. On the site, Evidence says only that we are going:
  one line, e.g. "Next: a field session with blind participants at the Louisiana Center for the
  Blind, November 11, 2026." No protocol, no expected numbers. It never becomes "validated" without data in
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

- Emphasis bands (the technology and call-to-action sections) use the `feature` tokens: a warm light band in light theme and ink in dark theme. No dark sections in light theme (user, 2026-10-25).
- Light default. Page #F3EDE3, cards #FBF8F2 with a 1px #DCD2C2 border, bands #EBE2D3, ink sections #1E1A16 with #F3EDE3 text. Text #1E1A16, muted #5E554B. Measured amber: text #9A4A0C, fill #F2A93B; primary action #B95A0F. Inferred (told site, plumb line) #0B6478. Warning #B02C17 on #FBEEE8, used only for placement warnings, always with the left rule, the glyph and the word. Dark and high-contrast themes derive from the same tokens.
- Type: Fraunces (display, variable, optical sizes) for headlines and big numbers; Atkinson Hyperlegible Next for everything else (designed by the Braille Institute for low vision, which is part of the story); JetBrains Mono for readings, probabilities, captions and status tags. Display 84, h2 48 to 52, lead 21, body 17 to 18, captions 13 to 15. Nothing below 13px, nothing below 4.5:1.
- Shape: sharp sections and tables, 12px cards, 8px buttons, 24px phone frame. Shadows only on the hero instrument card and the phone.

### 4.2 Layout

Asymmetric by rule (applies per page since ADR-0014): 7:5 hero with the live instrument card, 2:3 research with a pinned left column and an offset numbered quote list, full-bleed ink technology section 5:7, 3:2 product with an offset three-row list and the phone card, 2:3 validation with a ruled four-cell stat grid, 7:5 CTA band. A thin column of identical holes pinned at the right page edge follows scroll, its ringed dot sliding to the reader's place (the mark, read vertically). One header: wordmark, four links (How it works, Evidence, The app, Accessibility), one theme toggle that flips light and dark with a circular reveal from the button (View Transitions API; instant under reduced motion), one ink "Try Truehand" button. High contrast, System, Text only and Reduce motion live on /accessibility and in the web app toolbar.

### 4.2.1 Imagery (revised 2026-10-25: no stock photography)

No stock photos anywhere. Imagery is our own: custom SVG illustrations in the palette (the braille-cell and breadboard grid, a hand and probe in line art, the app on the phone) and still renders of our own 3D breadboard scene. The five Unsplash photos are removed.

#### Superseded: stock photography

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
