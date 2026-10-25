# ADR-0014: Five short pages in a business tone; the site never discloses the method; a contact form

Status: accepted, 2026-10-25 (user review of the revamp preview)

## Context

After seeing the revamp the user found the one-page landing bloated, the tone academic rather than
business, and the six-line math section a risk: it makes the idea easy to copy. They also flagged
that "Web simulator open now. iOS app next." misdescribes the product (the app is the solution;
simulation is a mode), that founder names in the footer and the "research preview" tag do not fit a
company site, and that the readiness table (engine internals) undermines the web app.

## Decision

1. **Site map** (POSITIONING section 2): Home `/`, How it works `/how-it-works`, Evidence
   `/evidence`, The app `/app`, Accessibility `/accessibility`, Contact `/contact`, About `/about`.
   Each page is short; Home stays under four screens at 1440 px.
2. **Header**: mark + "Truehand" (no tag); links How it works, Evidence, The app, Accessibility;
   one theme toggle; ink "Demo" button (the web app, `/sim`); in-page calls to action say "Try Truehand". The toggle flips light and dark only,
   with a circular reveal from the button (View Transitions API, `clip-path` on
   `::view-transition-new(root)`; the one allowed non-transform animation, user-initiated and
   one-shot; instant under reduced motion or without the API). The bar follows the theme.
   High contrast, System, Text only and Reduce motion move to `/accessibility` and the web app
   toolbar (UI_CONTRACT 5.1). This replaces the Display popover.
3. **Product line**: "Truehand for iPhone and the web. Try the web app today." The app is the
   product on both platforms; simulation is a mode. Copy never calls the web app "the simulator".
4. **No method on the site** (POSITIONING section 3): no formulas, model numbers, thresholds,
   "information gain", prior-art comparison of our modelling idea, or engine internals (paths,
   tests, voltages, commands, hashes). Numbers keep a short label ("Simulated, 1,500 runs,
   October 2026"); the trace to the file is enforced by tests and kept in docs/EVIDENCE.md. This
   amends rule 1 of `.claude/rules/00-truehand.md` only in where the trace is shown, not in whether
   it exists.
5. **No roadmap on the site**: the phase chips (Research, Engine, Simulation, User validation, Pilot, Product) are removed; dates and phases live in docs/BUILD_PLAN.md. The status line still states where validation stands.
6. **Names**: founders and the university appear on `/about` only.
7. **Contact form** (`/contact`): name, email, organization (optional), phone (optional), reason
   (pilot, partnership, support, press), message. It posts to `POST /v1/contact` on the API, which
   validates (Pydantic, bounded lengths, honeypot field), rate-limits per client in memory, and
   sends one email to support@truehand.tech through the Resend HTTP API with the key in
   `TRUEHAND_RESEND_API_KEY` (Render env var, never in the repo). Nothing is stored. Without the
   key the endpoint answers 503 `contact_unavailable` and the page offers a prefilled `mailto:`
   instead. This is not a database, account or analytics system, so rule 5 holds.

## Consequences

The ten-section landing contract (UI_CONTRACT section 2) is replaced by per-page sections; e2e
specs and unit tests are updated in the revamp lanes. ADR-0007's "one-site scroll landing" is
superseded for the marketing pages; the light instrument direction stands. The 3D scene runs only
on How it works. The pitch and docs keep the full method for judges.
