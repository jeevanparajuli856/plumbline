---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.css"
  - "apps/web/**/*.html"
---
# Web design quality and performance

Condensed from ECC `rules/web/design-quality.md` and `rules/web/performance.md`.

## Design direction for Plumbline (decided, do not drift)
- **Tone:** precision instrument meets accessible lab notebook. Calm, exact, high-contrast. Light theme is the default (paper and ink, low-vision friendly); dark and high-contrast derive from the same tokens. Positioning and copy rules: `docs/POSITIONING.md` (read it before any landing or simulator work). Not a SaaS dashboard, not a game.
- **Memorable detail:** the plumb line itself: a vertical reference line / pendulum motif that settles as belief converges, and the breadboard row the probe actually landed on glows while the instructed row is outlined. Uncertainty is always drawn as spread, never hidden.
- **Palette:** tokens in `apps/web/src/styles/tokens.css`, generated from `tokens.json` by `scripts/build-tokens.mjs`. One warm accent for "measured", one cool accent for "inferred", a warning hue reserved for placement warnings. Light (default), dark and high-contrast themes are all intentional; `<html data-theme=dark|light|hc>`, absent means follow the OS.
- **Type:** IBM Plex Sans (400/500/600) for UI plus JetBrains Mono Variable with tabular figures for readings and probabilities. Self-hosted via fontsource. Max two families.

## Token names (the design hook greps for hard-coded hex values; use these instead)
Colors are referenced only through these custom properties (or their Tailwind `@theme inline` aliases). A literal `#rrggbb` anywhere outside `tokens.css` / `tokens.json` is a defect.
```
--bench  --surface-1  --surface-2  --surface-raised
--hairline (decorative only)  --border-strong (control boundaries, >= 3:1)
--text  --text-2  --text-muted
--measured  --inferred  --warning  --warning-text  --baseline
--on-measured  --on-inferred  --on-warning
--focus  --focus-gap
--scene-bg  --scene-hole  --scene-board  --scene-glow-max
--radius-hard  --radius-soft
--motion-instant  --motion-fast  --motion-normal  --motion-slow  --motion-crawl  --ease-smooth
```
Semantics: measured = amber + filled + label; inferred = cyan + outlined; warning = vermilion + left rule + glyph + the word. Accents are never the only cue. Light theme splits each accent into a text value and a fill value; use `--measured` for fills and the text-safe variant the token file provides for text. Focus is a double ring: `--focus` outside `--focus-gap`.

## Banned (hook nudges on these)
Default card grids, centered hero + gradient blob, stock "Get Started" copy, uniform radius/shadow everywhere, gray-on-white with one accent, unmodified Tailwind/shadcn defaults, dark mode by reflex, hard-coded hex colors, em-dashes in UI copy.

## Required on every surface (at least four)
Scale contrast, intentional spacing rhythm, depth or layering, typography with character, semantic color, designed hover/focus/active, editorial or bento composition where it helps, motion that clarifies state.

## Honesty badges
`Badge` variants SIMULATED, PENDING and PROVISIONAL are part of the design system, not afterthoughts. They are text, readable by screen readers, and persist for the whole time the condition holds (the thermometer domain is SIMULATED for the whole session; the evidence row stays PENDING until done).

## Performance budgets
| Metric | Target |
|---|---|
| App JS (gzipped, excluding three) | < 300 kB |
| three + R3F + drei chunk | lazy-loaded, not loaded on `/` until the scene mounts, < 700 kB gz |
| LCP / INP / CLS | < 2.5 s / < 200 ms / < 0.1 |
| Lighthouse | performance >= 90, accessibility 100 |
| Scene | 60 fps on an integrated GPU laptop, < 150 draw calls (target about 27), dpr clamped `[1, 1.75]`, demand frameloop idles at 0 fps |

Fonts: `font-display: swap`, preload only the primary weight. Images: explicit dimensions, lazy below the fold. Animate transform/opacity only; durations from the motion tokens; `prefers-reduced-motion` snaps.
