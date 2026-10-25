# Image credits

Stock photography on the landing (`apps/web/src/landing/assets/photos/`, manifest `apps/web/src/landing/photos.ts`).
All are free photos under the [Unsplash License](https://unsplash.com/license): free for commercial and non-commercial use, no permission or attribution required. We credit them anyway. None is an Unsplash+ (paid) photo. Downloaded 2026-10-25, re-encoded to WebP at 800 and 1600 px wide (`cwebp -q 72`), metadata stripped.

| File stem             | Photographer   | Source                                  | Visible content                                          |
| --------------------- | -------------- | --------------------------------------- | -------------------------------------------------------- |
| braille-display-hands | Compagnons     | https://unsplash.com/photos/4MoIpDcSlr4 | hands on a keyboard and a refreshable braille display    |
| multimeter-probes     | Nekhil R       | https://unsplash.com/photos/g8Pr-LbVbjU | digital multimeter with red and black probes             |
| breadboard-wired      | Vishnu Mohanan | https://unsplash.com/photos/vtg8tAdoWVQ | breadboard with jumper wires and a microcontroller board |
| braille-rows          | Marcus Lenk    | https://unsplash.com/photos/ypChyZRAR_U | raised braille dots in numbered rows                     |
| breadboard-empty      | Vishnu Mohanan | https://unsplash.com/photos/AcTlEUJJEIg | empty breadboard beside a microcontroller board          |

Rules (from `.claude/rules/00-truehand.md`, honesty of numbers and claims):

- Stock photos never stand in for our users, our study participants, our partner or our hardware. Each one carries a visible "Stock photo: <name> on Unsplash" credit and alt text that describes only what is visible.
- No staged portraits of blind people. Photos show hands, tools and tactile materials.
- Not used in the hero (the hero is the live instrument card). Lazy-loaded below the fold, with explicit width and height.
