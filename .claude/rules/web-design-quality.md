---
paths:
  - "apps/web/**/*.tsx"
  - "apps/web/**/*.css"
  - "apps/web/**/*.html"
---
# Web design quality and performance

Condensed from ECC `rules/web/design-quality.md` and `rules/web/performance.md`.

## Design direction for Plumbline (decided, do not drift)
- **Tone:** precision instrument meets accessible lab notebook. Calm, exact, high-contrast. Not a SaaS dashboard, not a game.
- **Memorable detail:** the plumb line itself: a vertical reference line / pendulum motif that settles as belief converges, and the breadboard row the probe actually landed on glows while the instructed row is outlined. Uncertainty is always drawn as spread, never hidden.
- **Palette:** tokens in `apps/web/src/styles/tokens.css`. One warm accent for "measured", one cool accent for "inferred", a warning hue reserved for placement warnings. Both light and dark themes are intentional; high-contrast mode is a first-class theme.
- **Type:** a humanist sans for UI plus a tabular-figure mono for readings and probabilities. Max two families.

## Banned (hook nudges on these)
Default card grids, centered hero + gradient blob, stock "Get Started" copy, uniform radius/shadow everywhere, gray-on-white with one accent, unmodified Tailwind/shadcn defaults, dark mode by reflex.

## Required on every surface (at least four)
Scale contrast, intentional spacing rhythm, depth or layering, typography with character, semantic color, designed hover/focus/active, editorial or bento composition where it helps, motion that clarifies state.

## Performance budgets
| Metric | Target |
|---|---|
| App JS (gzipped, excluding three) | < 300 kB |
| three + R3F + drei chunk | lazy-loaded behind the scene route, < 700 kB gz |
| LCP / INP / CLS | < 2.5 s / < 200 ms / < 0.1 |
| Scene | 60 fps on an integrated GPU laptop, < 150 draw calls, dpr clamped `[1, 1.75]` |

Fonts: `font-display: swap`, preload only the primary weight. Images: explicit dimensions, lazy below the fold. Animate transform/opacity only.
