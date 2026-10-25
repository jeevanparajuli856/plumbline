# Image credits

No third-party images are used on the site (POSITIONING section 4.2.1, revised 2026-10-25).

Every image is our own:

- **Line art**: inline SVG drawn in the site palette (tokens only), in
  `apps/web/src/landing/art/Illustrations.tsx`: the braille cell and breadboard grid (Evidence),
  a hand holding a probe over breadboard rows (Home), and a talking meter beside the phone
  (The app). Each has alt text that describes only what it shows.
- **Scene renders**: still renders of our own 3D breadboard scene, made by
  `apps/web/scripts/render-scene.mjs` from a built app (light and dark, WebP at 1600 and 800 px
  wide) into `apps/web/src/landing/assets/renders/`. Re-run the script after the scene changes.
- **The mark and brand files**: `apps/web/public/brand/` (ADR-0013).

The five Unsplash stock photos used briefly during the 2026-10-25 revamp were removed the same
day, with their manifest (`landing/photos.ts`) and files.
