# Truehand design references

Date: 2026-10-25. Owner: landing and web-shell lanes. Read with `docs/POSITIONING.md`, `.claude/rules/web-design-quality.md` and ADR-0007 (`docs/decisions/0007-one-site-scroll-landing-light-instrument.md`).

Method. Every observation below comes from a page fetched on 2026-10-25. Where a fetch returned only a page title (neuralink.com, anduril.com, ycombinator.com library, whoop.com returned 403), that site is listed as "not observed" and nothing is claimed about it. Text extraction does not expose CSS, so palette and type observations about other sites are limited to what the copy and structure show. Type sizes and section heights in sections D and F are our design recommendations, not measurements; tune them in the browser. Numbers about Truehand come only from `docs/EVIDENCE.md` and the brief.

---

## A. The reference sites, and what to take from each

### A1. threeui.com (Three.js UI showcase)
URL: https://threeui.com/browse?sort=recent (read in two passes, offset 0 and 100000)

What is there. Recent product showcases are mostly dark or metallic: "Workshop Codex" (crystalline globe with three scroll-driven product panels), "Corvane Vault, Charter Anatomy" (an engraved charter with four selectable annotations, a slowly turning plate, pointer-driven relief), "Arca" (oversized directory title, pointer parallax), "Rondel One, Six Decks" (curved carousel with keyboard navigation). Recurring families the site itself groups: particles (Orbital Dust, Particle Swarm, Ember Storm), shaders (Water Ripple, Lava Lamp, Warp Field), and glass (Liquid Glass, Iridescent Glass, Glass AI Button). Only one entry, "Meng Timeline", is described as scroll-driven. Light entries exist but are few: "Connectivity Graph (light-mode canvas)", "Gallery Heading, Matte Rise", "Riso Sweep". Instrument-like entries: "Diagnostics Panel (layered planes, node cubes, wire mesh)", "Performance Gauges", "Thermo Button (thermometer with capillary liquid)".

Take:
1. The "Charter Anatomy" pattern: one slowly turning object with a small number of selectable annotations. This is our breadboard with six row annotations, each a real button with a DOM label.
2. Keyboard-navigable selection ("Rondel One, Six Decks"). Every 3D selection on our landing is also reachable by Tab and arrow keys.
3. "Diagnostics Panel" layering: exploded planes that separate a system into layers. Use it once, for the "how it works" section, where the circuit, the hand model and the belief separate into three planes in z.
4. Selection-driven change rather than pointer-driven change. Pointer parallax and relighting are decorative and are not reachable for a blind user, so we do not use them.

Avoid: particles, shader buttons, liquid and iridescent glass, metallic relighting, curved carousels. They are the dominant vocabulary of the showcase, which is exactly why they read as template on a research site.

### A2. tasteskill.dev (anti-template rules for coding agents)
URLs: https://www.tasteskill.dev/ , https://github.com/leonxlnx/taste-skill , https://mer.vin/2026/07/taste-skill-explained-anti-slop-agent-skills-for-ai-frontend-design/

What is there. An MIT-licensed set of SKILL.md files meant to stop agents shipping "the generic AI slop". The landing page asks the agent to infer the brief first (industry, audience, mood, motion depth, layout family), insists on "contrast and hierarchy parity across themes", and requires a pre-flight where "every box has to honestly pass". The GitHub page adds layout checks: "a clear title on the first screen", "equal margins", "no random blank stretches", and for app screens "quiet panels, aligned figures, colour spent on data". The mer.vin explainer reports a "complete em-dash ban", "no section-number eyebrows in heroes", bans on fake div-based UI chrome and fake screenshots, and three dials from 1 to 10: DESIGN_VARIANCE (default 8), MOTION_INTENSITY (default 6, where high means "GSAP pin/scrub effects and scroll reveals"), VISUAL_DENSITY (default 4).

Take:
1. "Colour spent on data". Our only saturated colors are measured amber, inferred cyan and the warning vermilion. Nothing decorative is colored.
2. Theme parity. Light is default, but dark and high-contrast get the same hierarchy, checked by axe in all three (EVIDENCE row "Screen-reader flow").
3. No fake UI chrome and no fake screenshots. The simulator on the landing is the real component in replay mode, not a picture of it.
4. Section-number eyebrows: our eyebrows are words ("The technology", "Validation status"), never "01 / 02".
5. Our own dial settings: DESIGN_VARIANCE high (editorial, asymmetric 12-column grid), VISUAL_DENSITY medium-high in `how` and `evidence` (tables are fine), MOTION_INTENSITY high only inside the three sticky scenes and near zero elsewhere.

### A3. gsap.com (ScrollTrigger, SplitText, ScrollSmoother, license)
URLs: https://gsap.com/pricing/ , https://open.windriver.com/info/uni-license-list/licenses/gsap-standard-no-charge-2025.html , https://gsap.com/docs/v3/Plugins/ScrollTrigger/ , https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/ , https://gsap.com/docs/v3/Plugins/SplitText/ , https://gsap.com/docs/v3/Plugins/ScrollSmoother/ , https://gsap.com/resources/React/ , https://gsap.com/showcase/

License, confirmed. The pricing page says "GSAP is now 100% free for all users, thanks to Webflow's support" and offers "the entire GSAP library for free". The license text grants use "on any website, web application, or digital interface by any person or entity". Two caveats from the license text: Prohibited Uses cover "tools that allow users to build visual animations without code" that compete with Webflow (does not apply to us), and "Webflow may terminate this GSAP License and revoke your access in its discretion". It is not open source. Motion's own comparison page (https://motion.dev/docs/gsap-vs-motion, a competitor's page, read with that in mind) calls Motion MIT and lists GSAP at 23 kb with ScrollTrigger adding 12 kb, against Motion scroll-linked adding 2.5 kb.

Patterns worth taking, with the exact mechanism:
1. Pinned, scrubbed scenes. `pin: true` with `scrub` linking timeline progress to scroll; a numeric scrub such as `scrub: 0.5` is "the amount of time (in seconds) that the playhead should take to catch up". `pinSpacing` pushes following content down. The same effect is available with CSS `position: sticky` plus our own progress scalar, which is what ADR-0007 chose.
2. Snap to labels. `snap: "labels"` with `duration {min,max}` and `ease` (default "power3") settles a scene on a keyframe after scrolling stops. We want this: each sticky scene has 3 to 5 named states and the scene should never rest between two of them.
3. Reduced motion as a first-class condition. `gsap.matchMedia()` with `reduceMotion: "(prefers-reduced-motion: reduce)"` and `duration: reduceMotion ? 0 : 2`, and the docs recommend `gsap.matchMediaRefresh()` when an in-page toggle changes the preference. We need an in-page "Reduce motion" toggle, so whichever library we use must re-run on that toggle.
4. SplitText's accessibility mode. Default `aria: "auto"` puts an aria-label with the full text on the parent and `aria-hidden` on the pieces; the docs warn it "will not honor the semantics or functionality of nested elements". Rule for us: split only headings with no links inside, or do not split at all.
5. ScrollSmoother keeps the native scrollbar on body and transforms a content wrapper; fixed elements inside the wrapper stop being fixed. We do not use smooth scrolling: native scroll is the screen reader contract (ADR-0007, ADR-0008).

Showcase: the page lists sites without describing techniques. The one relevant entry is https://www.seewhateyesee.org/ , an eye-condition simulator whose first CTA says "Enter the visual simulation" with the note "Includes distortion and motion", and a second CTA "Explore without sound". Take the pattern: warn before motion, and offer a parallel path that is the same experience with a channel removed.

### A4. 21st.dev (component catalog)
URL: https://21st.dev/

What is there. A catalog of React and Tailwind components installed via the shadcn CLI: marketing blocks (heroes, pricing, testimonials), primitives, templates, shaders, gradients. Its own copy says an AI-generated hero is "the average of every hero section on the internet".

Take: primitives only (accessible dialog, disclosure, tabs, toggle) and only after reading their ARIA. Do not install marketing blocks, shaders or gradients: pricing and testimonial sections do not exist on our site, and a catalog hero is by definition the average hero.

### A5. motionsite.ai (prompt marketplace)
URL: https://www.motionsite.ai/

What is there. A marketplace of "570+ prompts" that generate "highly animated React code" for Lovable, Bolt, Cursor or Claude; templates are named by vertical (Luxury, Health, Real Estate, "Beyond (3D)", "CyberTruck"). The page does not describe motion, timing or palette.

Take: nothing as a pattern. Use it as an anti-reference. If a section of our landing could be produced by pasting one of these prompts, it is generic by construction. The test: every motion on our page must be driven by an engine value (belief, entropy, placement posterior, reading). A template cannot know those values.

### A6. Cliches to avoid (union of the above, matched to our banned list)
Gradient blobs, floating glass cards, particle fields, shader buttons, iridescent helices, cursor parallax, infinite logo marquees, bouncing emoji, animated counters that count up to a number, section-number eyebrows, fake app screenshots, "Get Started", centered hero, card grids of identical cards, em-dashes. Already banned in `.claude/rules/web-design-quality.md`; this section is the evidence that these are what the showcase and template ecosystems currently produce.

---

## B. How research-driven hardware, AI and health companies present pre-product work

Observed: Physical Intelligence, Figure, 1X, Isomorphic Labs, Boston Dynamics, Apple Machine Learning Research, Anthropic Research, Butterfly Network, Oura, Be My Eyes (home and business), Envision, OrCam, Glidance. Not observed (title only or 403): Neuralink, Anduril, Whoop, OpenAI.

### B1. Physical Intelligence (https://www.pi.website/ , https://www.pi.website/blog/pi0)
Structure: nav (Home, Research, Join Us), a one-paragraph mission, one featured item tagged "New" ("Frontier Models for Every Robot"), then a reverse-chronological feed of about 17 dated cards from October 2024 to October 2026, then backers, then footer. No team photos; the team is "engineers, scientists, roboticists, and company builders". Status words: "New", "beta", "Join the waitlist". The research post "π0: Our First Generalist Policy" (October 31, 2024) lists 24 authors, links the PDF, gives a per-task score table against named baselines (OpenVLA, Octo, a smaller own variant), defines the scoring rubric (1.0 full success, partial credit), shows a video grid labeled success or fail, and ends with "still in their infancy" plus named open problems. It withholds trials per task and confidence intervals on the page. Take: the dated research feed as the spine of credibility; a named baseline in every result; a rubric stated next to the score; failures shown, not only successes; an honest "where we go from here".

### B2. Figure (https://www.figure.ai/ , https://www.figure.ai/news/helix)
Home: nav, hero "The future of home help is here", then sections for Helix ("The intelligence behind Figure 03"), home use, team ("The team bringing impossible ideas to life", with only an aggregate "over 100 years of combined AI & humanoid experience"), newsletter, contact form. The Helix post (February 20, 2025) gives architecture numbers (7B System 2 at 7 to 9 Hz, 80M System 1 at 200 Hz, about 500 hours of teleoperation) and frames firsts "to our knowledge", but gives no success rates, no baselines, no failure cases. Take: one named technology ("Helix") with its own explainer page; hedged novelty ("to our knowledge"). Do not copy: present-tense availability claims and results without baselines. Our advantage is that we do have a baseline and a failure case.

### B3. 1X (https://www.1x.tech/)
Very short page: product name hero, "$200 Deposit" and "Order", one careers card, one video card ("Experience NEO"), "Get notified", footer with "Investor Relations". No specs or metrics. Take: a single primary action that is concrete and low-commitment. Ours is "Open the simulator".

### B4. Isomorphic Labs (https://www.isomorphiclabs.com/)
Hero "Solve all disease", mission block, news cards, a "Work with Us" banner, Leadership / Culture / Heritage cards, an "Isomorphism" name explainer, a founder quote with portrait, dated announcements, and footer emails split by purpose (press, partnering). Withholds pipeline, partners, benchmarks. Take: the name explainer (we have one: why a plumb line), the heritage link (their AlphaFold; ours is the three named prior-art methods we build on), and purpose-split contact addresses ("partner", "pilot", "press") rather than a generic form.

### B5. Boston Dynamics (https://bostondynamics.com/)
Commercial structure: logo strip of named customers, one block per product with "Learn About", solutions grid, whitepaper CTA, "Get Started". Atlas, the research robot, is presented in the same product template with copy like "unmatched robotic strength", and the page has no metrics. Take, as a caution: when research is dressed as product the claims go unquantified. Keep research and product visibly separate (our `research` and `ladder` sections).

### B6. Apple Machine Learning Research (https://machinelearning.apple.com/) and Anthropic Research (https://www.anthropic.com/research)
Apple: single-column index; featured post; "Research highlights"; "Recent publications" as cards with tag chips ("research area", "conference EMNLP", "Published year 2026"), an "Authors" line and "Read paper"; events; one "Work with us" banner. Labels are short and low-pressure. Anthropic: an intro sentence, team cards with post counts, a featured carousel paged "01 / 05", then a filterable feed ("197 ARTICLES"). Each item is tag, date, title, one or two sentence summary. Take: the citation card format for our `research` section: venue chip, year chip, participant count, one quote, a "Read the paper" link. Metadata order date or venue first, then title, then action.

### B7. Butterfly Network (https://www.butterflynetwork.com/)
A cleared product, so the interest is the qualifier discipline: "FDA-cleared handheld ultrasound devices"; "For prescription use only"; Compass AI "not intended to provide information used to make decisions regarding diagnosis or therapeutic purposes"; AI tools "support workflows, not replace clinical judgment"; comparative claims footnoted ("As compared to other commercially available handheld ultrasound devices"); a market claim footnoted to a dated third-party report and page. Weakness visible on the page: some case-study numbers conflict between headline and thumbnail. Take: every comparative number carries a footnote naming what it is compared against; a plain "what this does not do" sentence next to the claim.

### B8. Oura (https://ouraring.com/)
Hero "Wear your best life". Its one big stat, "86% of Oura Members see their health improve", is footnoted "Based on a 2026 survey with 3,501 Oura members after using Oura Ring for 30 days". Health features carry "intended for general wellness purposes only" and "not intended to diagnose, treat, cure, mitigate, monitor, or prevent any disease". Take: the n, the method and the date sit directly under the number. That is the format for our simulation results once `stability.py` runs here.

### B9. Accessibility companies writing for blind users and sighted buyers at once
Be My Eyes home (https://www.bemyeyes.com/): a utility bar with skip link, color-mode switch (light, dark, high contrast) and language picker before anything else; hero "Let's see the world together" whose one sentence names both audiences ("blind or low vision users" and "companies"); a benefits list in short plain claims ("Free and unlimited calls", "100% anonymous"); live counters (volunteers, blind and low-vision users) with no source or method; a separate "Are you a business?" block. The fetch noted generic repeated "Read More" links and a mislabeled store badge alt text. Be My Eyes business (https://www.bemyeyes.com/business/): hero "Making good business accessible"; "Trusted by" strip that includes the National Federation of the Blind and RNIB; case studies named by organization and program (Microsoft Disability Answer Desk, Amtrak "grew from a regional pilot to nationwide"); unsourced "up to" and "typically" percentages; person-first language throughout. Envision (https://www.letsenvision.com/): hero "Perceive Possibility" plus a sentence about access "for themselves"; press logos; named user testimonials with concrete tasks (telling sauce packets apart); organizations get only links. Several images have empty alt text. OrCam (https://www.orcam.com/en-us/home): product cards labeled by audience ("For the Blind & Visually Impaired", "For Low Vision & Reading Fatigue"); "Award Winning Innovations" with no award named; no studies cited. Glidance (https://glidance.io/): skip link; hero names the user ("people who are blind or have low vision"); founder block for a founder who is blind and previously founded Microsoft Soundscape; "earliest Gliders" testimonials; awards as logos; waitlist "for when we re-open orders". No formal study described. Take: (1) theme and text controls first in the tab order; (2) one sentence that names both audiences; (3) concrete task-level user quotes, attributed, with permission; (4) a separate, labeled path for organizations; (5) unique link text ("Read the CHI 2026 paper", never "Read more"). Avoid what these pages do weakly: unsourced counters, unnamed awards, empty alt text, duplicated mobile and desktop content read twice by screen readers.

### B10. Cautionary case: Humane
Sources: https://www.fortune.com/2025/02/19/hp-humane-deal-ai-pin-shutting-down , https://the-decoder.com/humane-ends-its-ai-pin-in-ten-days-sells-technology-to-hp-for-116-million/ (via search results). The AI Pin was marketed as a possible smartphone replacement, had a reveal video that needed correcting, and was shut down in February 2025 when HP bought the team and patents. Lesson for our page: a demo that is later shown to be wrong costs more than a demo that is modest. Our demo replays a recorded fixture and says so; the live meter mode is labeled separately.

### B11. Patterns across B, as rules
- Order that recurs: mission sentence, one named technology, dated research or news, team, one action. Product companies add product blocks; research companies put the feed first.
- Status is stated in one or two words near the action ("beta", "waitlist", "New"). Ours is the verbatim status line.
- The most credible evidence on these pages is a result against a named baseline with the protocol next to it (π0). The least credible is an unsourced counter or an unnamed award.
- Withholding is normal: every company above withholds pipeline, protocol detail or failure rates. What they do not do (the credible ones) is publish a number without saying what it is.

---

## C. Honest-status language

Regulatory context. Truehand is not a medical device and should not borrow regulatory terms that imply a status it does not have. The FDA's IDE page (https://www.fda.gov/medical-devices/premarket-submissions-selecting-and-preparing-correct-submission/investigational-device-exemption-ide) requires investigational devices to carry "labeling stating that the device is for investigational use only". We borrow the shape (state what it is for, and what it is not yet) without the term. Oura's "intended for general wellness purposes only" and Butterfly's "not intended to provide information used to make decisions" show the shape: scope, then exclusion.

Phrasings for Truehand (use verbatim or near verbatim):
1. "Simulation validated. User validation in progress." (the status line, from POSITIONING.md)
2. "Results on this page come from simulated faults and a simulated hand. We have not yet measured how real hands miss. That measurement is scheduled with the Louisiana Center for the Blind."
3. "The confusion model uses three assumed numbers: 0.78, 0.08 and 0.03. They will be replaced by a measured matrix, and every experiment re-run." (from brief section 4)
4. "Research preview. Not a safety device. Do not use it to work on mains voltage or anything that can hurt you." (scope then exclusion; mains and safety exclusion is our judgment, confirm with the team)
5. "Simulated, n = [faults] per arm, [k] seeds, command `python -m truehand.experiments.stability`, run [date]." Fill only from `docs/results/`; until then the row says PENDING.
6. "Compared with the published method: entropy-based test selection that assumes the probe is where you were told (Gao et al., 2014)." (named baseline next to every comparison)
7. "Thermometer: SIMULATED. The engine is the same; the instrument model is a textbook heat equation, not a real probe." (source in EVIDENCE: Incropera ch. 5)
8. "When two faults produce the same voltages at every row, Truehand says it cannot tell them apart and asks for a different measurement. It does not pick one."
9. "Preliminary. Not peer reviewed." on any number from our own runs until a paper exists.
10. "No participant results yet." in the evidence table row for user sessions, replaced only by a dated file in `docs/results/sessions_<date>.md`.

Do not write: "validated" alone, "clinically", "proven", "accuracy" without n and method, "investigational device", "FDA", "first ever", "AI-powered".

---

## D. Implementation guidance for the frontend lanes

### D1. Motion stack decision

| Need | Custom scroll scalar + motion (ADR-0007) | GSAP ScrollTrigger + useGSAP |
|---|---|---|
| Native scroll kept for screen readers | Yes (passive listener, sticky CSS) | Yes if no ScrollSmoother |
| Pinning | CSS `position: sticky` | `pin: true`, pinSpacing |
| Scrub smoothing | Our damp in `useFrame` | `scrub: 0.5` |
| Snap to scene states | IntersectionObserver plus our code | `snap: "labels"` built in |
| Reduced motion, including in-page toggle | `useReducedMotion` plus our store flag | `gsap.matchMedia()` plus `matchMediaRefresh()` |
| Unit-testable choreography | Pure `poseAt(progress)` (already planned) | Timelines are harder to unit test |
| Driving R3F | Store read inside `useFrame` | Same, via `onUpdate` writing to the store |
| License | MIT | Free, closed, terminable at Webflow's discretion |
| Added weight (per motion.dev, competitor source) | scroll-linked +2.5 kb | ScrollTrigger +12 kb on 23 kb core |

Recommendation: keep ADR-0007. One progress scalar per sticky scene, computed from the section's `getBoundingClientRect()` in a passive rAF listener, written to `state/landing.ts`; the R3F scene reads it in `useFrame` and damps toward `poseAt(progress)`; DOM text uses `motion` (`whileInView` with `viewport={{ once: true }}`) for entrances only. Add GSAP only if the landing lane cannot get snap-to-state to feel right in two days; if added, ScrollTrigger may only write progress into the same store, so `poseAt` stays the single source of choreography and stays tested. Never use ScrollSmoother or drei `ScrollControls`.

### D2. Signature moments
Each sticky scene is a `<section aria-labelledby>` whose static mono caption is the DOM twin and is present in the HTML before any script runs. Captions are not live regions (ADR-0007). Numbers in twins are read from the replay fixture at render time, never typed into copy. Durations below name the motion tokens that already exist in `apps/web/src/styles/tokens.css` (all set to 0 ms under reduced motion there). `--ease-bounce` exists in that file; do not use it on the landing. Durations are for event-triggered moments; scrubbed moments have no duration, they follow scroll.

1. Plumb line settles as entropy falls (mast, and reused at the end of `play`).
   - Trigger: page load for the first settle; in `play`, each accepted reading.
   - Motion: pendulum amplitude proportional to belief entropy H(b), damped to rest; one swing at most per state change.
   - Duration: `--motion-pendulum-settle` (aliases `--motion-crawl`, 1000 ms in `apps/web/src/styles/tokens.css`), `--ease-smooth`, critically damped, no overshoot past the previous amplitude. Rate stays well under 3 Hz.
   - Reduced motion: line drawn at its final angle, no swing.
   - DOM twin: "Uncertainty: high. The line hangs still only when the evidence agrees." Then in play: "After reading 2: uncertainty low."
2. Told row 3, landed row 2 (play, scrubbed then snapped).
   - Trigger: scroll into the pinned `play` scene; states: instructed, probe travelling, landed.
   - Motion: row 3 outlined dashed cyan; probe descends over `--motion-probe-travel` (600 ms) when stepped by button, or follows scroll when scrubbed; it lands on row 2, which fills amber. The landed row is hidden until the reading is accepted (POSITIONING section 5).
   - Reduced motion: three static frames, one per state, swapped at snap points.
   - DOM twin (template, values filled from `worked_example.json`): "Step 1. Told: touch row 3. The hand lands on row 2. Reading: 3.671 volts."
3. The warning strike (play, event).
   - Trigger: engine posterior P(l != n | r) > 0.5 in the replayed step.
   - Motion: vermilion left rule draws top to bottom once, glyph and the word "Warning" appear; no shake, no flash, no repeat.
   - Duration: `--motion-warning-strike` (aliases `--motion-fast`, 180 ms), `--ease-sharp`.
   - Reduced motion: appears fully drawn.
   - DOM twin: "Warning. Your probe is not where you think it is. Most likely row: 2." In `/sim` this is `role="alert"`; on the landing it is static text in the step list.
4. Belief bars race side by side (play).
   - Trigger: each replay step, from the fixture.
   - Motion: Truehand bars (cyan, outlined) and published-method bar (dashed neutral) tween width to the new posterior; the published bar jumps to its certain wrong answer while ours stays spread.
   - Duration: `--motion-belief-bars` (aliases `--motion-normal`, 350 ms), `--ease-smooth`. Labels are text percentages, updated at the end of the tween, not counted up.
   - Reduced motion: bars snap.
   - DOM twin: a real table, two columns, "Truehand" and "Published method", top candidate and percentage per step, values from `worked_example.json`.
5. Six lines of math light up (how, scrubbed).
   - Trigger: progress through the `how` section, one line per sixth.
   - Motion: the current line goes from text-2 to text with a 2 px measured or inferred left rule; previous lines stay at full ink. The matching part of the 3D scene highlights (confusion fan over rows for line 1, likelihood for line 2, bars for line 3, row choice for line 4, warning for line 5).
   - Duration: follows scroll; color change uses `--motion-fast`.
   - Reduced motion: all six lines at full ink, no highlight sequence.
   - DOM twin: each line with its plain-English gloss, always visible.
6. Exploded layers (how, one scrubbed transition).
   - Trigger: second half of `how`.
   - Motion: board, hand-confusion plane and belief plane separate in z (the threeui "Diagnostics Panel" idea), then recombine. Camera move only, no object spin.
   - Reduced motion: the separated pose shown statically.
   - DOM twin: "Three models, one update: the circuit says what each row should read, the hand model says where the probe may be, the belief combines them."
7. The roast cross-section (generalize).
   - Trigger: scroll into `generalize`; SIMULATED badge visible before any motion.
   - Motion: a sliced sphere with a temperature gradient; the probe tip depth is uncertain and drawn as a spread band, not a point. Color ramp uses the measured hue only for the measured reading.
   - Reduced motion: final frame.
   - DOM twin: "SIMULATED. Same engine, different instrument: a kitchen probe thermometer. The engine infers both doneness and how deep the tip really is." Plus the honest step-2 recovery story.
8. The refusal (play or how, event).
   - Trigger: a scripted moment showing the unresolved pair from `unresolved_pair.json`.
   - Motion: two candidate bars that stay equal, with a bracket and the word "Unresolved". No motion beyond the bracket draw.
   - DOM twin: "Unresolved. LED open and LED reversed give the same voltages at every row. Truehand asks for a different measurement instead of guessing."

Play never auto-starts on scroll (ADR-0007). Scrubbed scenes show states; the "Play the worked example" button runs the timed replay with Pause and Replay controls (WCAG 2.2.2 Pause, Stop, Hide, https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html , applies to moving content that starts automatically and lasts more than five seconds).

Reduced motion basis: WCAG 2.3.3 Animation from Interactions (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) names parallax as "often non-essential" and cites "dizziness, nausea and headaches" for vestibular disorders. We meet it with both the OS query and an in-page toggle.

### D3. Typography scale and spacing rhythm
Fixed by POSITIONING.md: display 68 px, landing lead 20 to 22 px, simulator body 18 px, instruction 34 px, reading input 26 px mono, warning sentence 22 px. Recommended fill-ins, 1.25 ratio from 18:

| Role | Size / line-height | Family, weight |
|---|---|---|
| Display (H1) | 68 / 72, tracking -0.01em | Plex Sans 600 |
| H2 | 44 / 52 | Plex Sans 600 |
| H3 | 28 / 36 | Plex Sans 500 |
| Lead | 22 / 34 | Plex Sans 400 |
| Body | 18 / 28, measure 60 to 72 characters | Plex Sans 400 |
| Eyebrow | 14 / 20, uppercase, tracking 0.08em | JetBrains Mono 500 |
| Caption (DOM twin) | 16 / 24 | JetBrains Mono 400, tabular |
| Numbers in tables | 18 / 28 | JetBrains Mono, tabular |

Mobile: display 44, H2 32, lead 20, body 18 (never below 16 for any text). Spacing on an 8 px base: 4, 8, 16, 24, 32, 48, 64, 96, 128. Section padding 128 desktop, 64 mobile; heading to lead 24; lead to body 32; block gaps 48. Grid: 12 columns, 24 px gutters, 64 px margins (POSITIONING), 16 px margins on phones.

### D4. Section rhythm
Recommended heights, in viewports (vh), for the nine POSITIONING sections:

| Section | Height | Sticky scene |
|---|---|---|
| mast | 100 | No; static scene pose, the edge cell's ringed dot settles once |
| research | about 120, normal flow | No |
| problem | 100 | No |
| play | 300, scene sticky for 200 | Yes: moments 2, 3, 4 |
| how | 250, scene sticky for 175 | Yes: moments 5, 6 |
| generalize | 200, scene sticky for 125 | Yes: moment 7 |
| ladder | 100, normal flow | No |
| evidence | normal flow (table length) | No |
| close | 80 | No; the edge cell's ringed dot at rest |

Three sticky scenes. `play` and `how` are adjacent by design, so put a 40 vh flow band carrying the step list between them. Total about 12 to 13 viewports. On phones, sticky scenes shorten to 150 vh and the canvas may be replaced by static frames if the frame budget fails (ADR-0007 re-visit clause).

---

## E. The site as an investor-facing pitch, without saying "investors"

### E1. What we observed
- Sequoia's business-plan outline (https://sequoiacap.com/article/writing-a-business-plan/): company purpose ("define your company in a single declarative sentence"), problem, solution ("your eureka moment"), why now ("Nature hates a vacuum"), market potential, competition, business model, team, financials ("if you have any"), vision. This is the order a reader with that training scans for.
- Physical Intelligence puts the dated research feed first and its backers in an "Acknowledgments" block near the bottom; the ask is "Join the waitlist" and "Join Us".
- Isomorphic Labs: a one-line mission, heritage (the research it comes from), founder quote, partnership email. The ask is "Work with Us".
- 1X: one concrete ask and an "Investor Relations" link in the footer, nowhere else.
- Glidance: a founder story with direct lived experience, early users named with their city, awards, a waitlist. The traction is people, not numbers.
- Be My Eyes business: partners named by organization and program, a pilot that "grew from a regional pilot to nationwide", blindness organizations in the trust strip.
- Oura: one number, with n, method and date directly under it.
- Not observed (fetch returned title only): Neuralink's early site and trial pages, YC's pitch deck library page.

### E2. Section order for a reader with 90 seconds
The POSITIONING order already maps onto Sequoia's. What the 90-second reader needs is that each section's first sentence carries the pitch on its own:

| Order | Section | Pitch job | First sentence carries |
|---|---|---|---|
| 0 | mast | Purpose | Category, promise, status line |
| 1 | research | Problem plus why now | Three studies, 51 blind participants, AI raised the verification burden |
| 2 | problem | Problem, concrete | "The display was solved. The probe was never solved." |
| 3 | play | Solution and moat | Baseline confidently wrong, Truehand warns and is right |
| 4 | how | Defensibility | Actuator noise with a recoverable hidden state, named prior art |
| 5 | generalize | Market expansion | Same engine, second instrument, SIMULATED |
| 6 | ladder | Wedge and scale | Four rungs, who pays |
| 7 | evidence | Traction, honest | Phase chips with dates, table with DONE / IN PROGRESS / PENDING |
| 8 | close | The ask | One sentence, three exits |

### E3. The sentences that carry the pitch
Each is sourced; bracketed values fill only from files named.
1. "Truehand is the first assistant that infers the fault and the probe's true position from each reading." (POSITIONING copy rule; never "first ever")
2. "In three studies with 51 blind participants, two peer reviewed and one preprint, AI tools increased the work of checking answers instead of removing it." (EVIDENCE section 2, studies 1 to 3)
3. "Talking multimeters solved the display. Nobody solved the probe." (brief section 3, EEVblog)
4. "Every published diagnosis method assumes the test you asked for is the test that ran. We model the hand as a noisy actuator and recover where it really landed." (brief section 4)
5. "Told row 3, the hand lands on row 2 and reads 3.671 volts. The published method is certain of the wrong part. Truehand warns, asks once more, and names the right one." (fixture values only)
6. "When the physics cannot tell two faults apart, it says so." (POSITIONING)
7. "The dataset that makes this work, how blind hands actually miss, does not exist yet. We are measuring it with the Louisiana Center for the Blind." (EVIDENCE row "Measured confusion matrix"; true only while that session is booked or done)
8. "Web simulator open now. iOS app next." (POSITIONING product line)

### E4. Moat, wedge, traction, team, roadmap, ask
- Moat: (a) the formulation (actuator noise with a recoverable hidden state) stated against named prior art; (b) the measured confusion data from blind participants, which no competitor has; (c) the domain-agnostic engine (ADR-0003). Say (b) as "the dataset nobody has" only after the first session produces data; before that say "the dataset we are building".
- Wedge and ladder: four rungs from `docs/brief/Truehand_Scale_and_Build.md`; employment context from EVIDENCE section 3 (52.3% employed against 76.3% overall, 2023 ACS via NRTC). Do not use the "70% unemployed" figure (EVIDENCE marks it inaccurate).
- Traction that is honest at this stage, in this order: simulation results with n, seeds, command, date (once run); named partner organization with written permission; letter of support (EVIDENCE row, PENDING); people who used the simulator, counted from a real log if one exists, otherwise not shown. No waitlist count unless a waitlist exists; we are not building one (rule 5).
- Team block: two names, roles, university, one line each on what they built; advisor slot shown as "Advisor: to be announced" only if one is being asked, otherwise omitted. No logos of organizations that have not agreed.
- Roadmap: the six phase chips with month and year (Research, Engine, Simulation, User validation now, Pilot, Product). Dates come from `docs/BUILD_PLAN.md`; a phase without a date shows "date to be set".
- One ask, three labeled exits: "Join the pilot" (for blindness organizations and instructors), "Partner with us" (purpose-split email, Isomorphic pattern), "Read the method" (the `how` section or a write-up). The primary button stays "Open the simulator".

### E5. Show now, hold for the finals
Show now: the worked example replay with the side-by-side published-method baseline; the six-line math with glosses and named prior art; the refusal (unresolved pair); the simulated second instrument with its SIMULATED badge; the validation status table and phase chips; the three cited studies. Hold, and say they are coming without describing results: the measured confusion matrix from the Louisiana Center for the Blind; the real breadboard blindfold run on camera with a deliberate slip; the iOS app; the five-seed stability and stress-test numbers until they have run here and been reviewed. The evidence table already lists these as PENDING, which is the right amount of reveal: the reader sees that the work is planned and dated, not what it found. Like π0 and Helix, we can show the method in full and still withhold the newest data.

---

## F. Rules for the frontend lane

1. Native document scroll only. No ScrollSmoother, no drei `ScrollControls`, no scroll-jacking.
2. One progress scalar per sticky section, written to `state/landing.ts`; the scene pose comes only from the pure, unit-tested `poseAt(progress)`.
3. GSAP is not added unless the landing lane lead records why in an ADR; if added, it only writes progress to the store and never animates the R3F scene directly.
4. Every sticky scene has 3 to 5 named states and snaps to one after scrolling stops.
5. Every motion is driven by an engine or fixture value (entropy, belief, placement posterior, reading). Decorative motion is not allowed.
6. Every section is `<section aria-labelledby>` with a static mono caption in the initial HTML; captions are not live regions.
7. Every number in a caption or bar label is read from a fixture or `docs/EVIDENCE.md`-backed data file at render time; no number is typed into JSX copy.
8. `prefers-reduced-motion: reduce` and the in-page "Reduce motion" toggle both snap every moment to its final state; test both in Playwright.
9. The worked example never starts on scroll; it has Play, Pause and Replay buttons.
10. The warning appears once per event, draws in `--motion-warning-strike`, never shakes, flashes or repeats; nothing on the page changes faster than 3 Hz.
11. Only three saturated hues, each with a non-color cue: measured amber filled plus label, inferred cyan outlined, warning vermilion with left rule, glyph and the word "Warning".
12. Use the type scale and spacing in D3; no text below 16 px; tabular mono for all numbers.
13. No gradient blobs, glass cards, particles, shader buttons, cursor parallax, marquees, counters that count up, section-number eyebrows, fake screenshots, centered hero, or em-dashes.
14. Do not install 21st.dev or similar marketing blocks; primitives only, after checking their ARIA.
15. If text is split for animation, use SplitText `aria: "auto"` or an equivalent that labels the parent and hides pieces, and never split text that contains a link.
16. Theme, text-only and reduce-motion controls come first in the tab order after the skip link (Be My Eyes pattern).
17. Link text is unique and specific ("Read the CHI 2026 paper"), never "Read more" or "Learn more".
18. Every comparative number names its baseline in the same sentence or an adjacent footnote.
19. Every result from our own runs shows n, seeds, command and date beneath it, and "Preliminary. Not peer reviewed." until a paper exists; otherwise the row shows PENDING.
20. SIMULATED, PENDING and PROVISIONAL badges are text, persist for as long as the condition holds, and appear before any motion in their section.
21. No partner, advisor or organization name or logo appears without written permission on file.
22. The status line and product line are used verbatim; the Nexus Technology Cup is never named.
23. The landing works with WebGL off and JavaScript slow: all content, all numbers and all captions are readable without the canvas.
24. Canvas lazy-loads after the mast text paints; LCP is text, not the scene.
25. Before merge: axe zero serious or critical in light, dark and high-contrast; VoiceOver pass of the full landing in reading order; reduced-motion Playwright run green.

