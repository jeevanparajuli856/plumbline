# ADR-0007: One site: scroll-driven landing -> `/sim`; shared R3F scene; "Light instrument" visual direction

Status: accepted, 2026-10-25

## Context

The judges see one story in one place. The brief's ten-minute outline (section 11) opens with a
recorded AI error and moves to the circuit, the blindfold run, and the sweep figure. The plan's
Impact and Feasibility criteria need one deployed URL that a judge can open cold. A separate
marketing site would be a second deploy and a second write surface, and rule 5 of
`00-plumbline.md` forbids extra scope.

The 3D scene is for sighted judges. The text channel is the product for the primary user
(ADR-0008). A landing page that takes over the page scroll would break the native scroll that
screen reader users rely on, and the plan says drei's `ScrollControls` does exactly that. The
Nexus criteria have no published weights, so visual quality is judged by impression. That makes a
coherent visual direction a real requirement, but not a number to claim.

## Decision

One site with four routes: `/` (landing), `/sim` (the product), `/evidence`, and `/about`. The root
URL `/?demo=worked-example` redirects to `/sim?demo=worked-example`.

One `Canvas` mounts at app level with a `sceneMode` of `landing`, `sim`, or `hidden`. The camera
moves from the landing pose to the sim pose through `CameraRig`, which lerps inside `useFrame` and
calls `invalidate()` only within 300 ms of a scroll. The Canvas is lazy-loaded. The app works with no
WebGL, through the text channel, and a Playwright spec covers that case.

Scroll is DOM-driven. `landing/useScrollProgress.ts` is a passive listener with requestAnimationFrame
that writes `progress` and `section` to `state/landing.ts`. `landing/choreography.ts` exports a pure
function `poseAt(progress)` that returns the scene pose and has unit-tested keyframes. The
decision not to use drei `ScrollControls` is deliberate: it takes over document scrolling, which
breaks native scroll and screen reader page navigation. Reduced motion snaps to the section keyframe
through an IntersectionObserver.

The landing has eight sections, each a `<section aria-labelledby>` with a static DOM caption: mast,
problem, play, how, generalize, ladder, evidence, and close. Captions never go to the live region.
Play runs the worked example through the real store in replay mode and never starts on scroll.
The play section keeps a static ordered list of the six steps in the DOM.

Visual direction, "Light instrument" (changed from dark on 2026-10-25 evening at the user's request: light default, low-vision friendly; dark and high-contrast derive from the same tokens). Positioning and copy rules live in docs/POSITIONING.md: the site is framed as a research-backed product company, never as a competition entry. Tokens are in `tokens.json`, generated into `styles/tokens.css`.
Light defaults: paper `#F6F3EC`, ink `#15181C`, panels `#FFFFFF`, hairline `#CFC9BD`; measured text `#8A5200` / fill `#F2A93B`; inferred text `#0B6478` / fill `#5FD3E8`; warning `#B02C17`. Dark theme: bench `#0B0D10`, measured amber `#F2A93B`, inferred cyan `#5FD3E8`, warning
vermilion `#FF5A36`, text `#ECE9E2`. Light and high-contrast themes are included. Fonts are IBM
Plex Sans and JetBrains Mono, self-hosted through fontsource. The scratch contrast ratios from the
design pass (text on bench 16.05, measured text 9.74, warning text 8.43, control boundary 3.95, focus
13.7) are scratch computations from 2026-10-25. They are to be re-run by the a11y lane with axe, not
inside `engine/`. Accents are never the only cue: measured is amber plus a filled marker plus a label.

Scene budget: the scratch design estimate is about 27 draw calls against a budget of 150. That is an
estimate to be measured by the scene lane, not a result.

## Consequences

Positive:

- One URL, one build, one store. The landing and the simulator share the scene, so the judges see
  the same object the blind user hears about.
- Native scroll and screen reader page navigation keep working.
- The visual language is set once and carries the honesty labels (SIMULATED, PENDING,
  PROVISIONAL) as first-class badges.

Negative:

- The choreography is our code. The pure `poseAt` function and its tests must carry the feel, and
  that takes design time in a short window.
- A single Canvas at app level means one WebGL context has to survive route changes. Context loss
  is handled by the `webgl_lost` error path (ADR-0008 and the store's error codes).

What to re-visit:

- If the scene budget or the frame rate fails on the demo laptop, drop the landing scene to DOM
  only and keep `/sim` as the single 3D view.
- If the sighted judges find the landing unclear in the semifinal, change the copy before the
  visuals. The text channel is the contract.

## Alternatives considered

- **drei `ScrollControls`.** Rejected: it hijacks document scroll and breaks screen reader navigation
  of the page, which is a direct conflict with ADR-0008.
- **A separate marketing site and a separate app.** Rejected: two deploys, two write surfaces, and
  extra scope under rule 5.
- **A video-only landing.** Rejected: the Nexus bar is "input to output", and a video has no input.
  The video is a supporting asset (plan, Video storyboard), not the landing.
- **A dark default theme.** Considered first, then rejected on 2026-10-25: the user asked for a light, blind-friendly default; dark remains available. Original note:
  it is not user-tested. Light and high-contrast themes exist as options.
