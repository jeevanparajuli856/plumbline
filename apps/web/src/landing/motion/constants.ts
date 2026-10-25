/** Every tween runs only under this query; reduced motion matches nothing and keeps the static final state. */
export const MOTION_ALLOWED = '(prefers-reduced-motion: no-preference)'
/** Only a mouse or trackpad steers the device tilt; touch would fight the scroll. */
export const FINE_POINTER = '(pointer: fine)'

/**
 * Past this many ms since navigation, above-the-fold content (the H1, the hero device) has been
 * on screen long enough that hiding it to animate in would read as a flicker, so a late motion
 * chunk leaves it as painted.
 */
export const LATE_LOAD_MS = 600

/** Where a once-only reveal fires: the element's top crosses this point of the viewport. */
export const REVEAL_START = 'top 85%'

// Headline: rises word by word on load, each word skewing upright as it lands.
export const HEADLINE_RISE_PERCENT = 40
export const HEADLINE_SKEW_DEG = 6
export const HEADLINE_WORD_DURATION_S = 0.7
export const HEADLINE_WORD_STAGGER_S = 0.08
export const HEADLINE_DELAY_S = 0.1

// Quote: types itself in, line after line.
export const QUOTE_WORD_DURATION_S = 0.25
export const QUOTE_WORD_STAGGER_S = 0.045
export const QUOTE_LINE_PAUSE_S = 0.18
/** Two word tops closer than this sit on the same rendered line. */
export const LINE_TOLERANCE_PX = 2

// Bars: the two-method race, in timeline units (stage 1 spans 0..1, stage 2 spans 1..2).
// The race scrubs while section#play crosses the viewport; the page is never held.
export const BARS_START = 'top 80%'
export const BARS_END = 'bottom 40%'
export const BARS_SCRUB_S = 0.6
/** The published method commits at once; ours spreads over the whole stage. */
export const BARS_SLAM_DURATION = 0.2
export const BARS_SPREAD_DURATION = 1
export const BARS_STAGE_COUNT = 3

// Rows: product list slides in from the left.
export const ROWS_OFFSET_PX = 48
export const ROWS_DURATION_S = 0.6
export const ROWS_STAGGER_S = 0.12

// Stat: counts up once.
export const STAT_DURATION_S = 1.4
export const STAT_MAX_DECIMALS = 6

// Edge cell column: the ringed dot follows the page and wobbles between neighbouring holes until
// the reading settles. Two incommensurate periods so the path never repeats as a visible loop;
// both are far below the 3 Hz flash threshold.
export const WOBBLE_X_PERIOD_S = 3.7
export const WOBBLE_Y_PERIOD_S = 2.9
/** Widest wobble, as a percent of the dot's own size (y reaches toward the neighbouring hole). */
export const WOBBLE_X_PERCENT = 18
export const WOBBLE_Y_PERCENT = 55
/** How quickly the wobble amplitude follows a change in landing progress. */
export const WOBBLE_SETTLE_S = 0.8
/** How quickly the dot glides to the hole that matches the scroll position. */
export const SLIDE_S = 0.35

// Stat: an overshooting ease, clamped so the number never shows more than was measured.
export const STAT_EASE = 'back.out(1.7)'

// Reveal: blocks enter once on scroll.
export const REVEAL_RISE_PX = 32
export const REVEAL_DURATION_S = 0.8
export const REVEAL_MASK_DURATION_S = 1
export const REVEAL_ITEM_RISE_PX = 24
/** Gap between staggered items: 75 ms, inside the 60 to 90 ms the contract asks for. */
export const REVEAL_STAGGER_S = 0.075

// Device: the phone floats in, then tilts with scroll and (fine pointers) toward the pointer.
export const DEVICE_FLOAT_Y_PX = 40
export const DEVICE_FLOAT_ROTATE_X_DEG = 12
export const DEVICE_FLOAT_ROTATE_Y_DEG = -10
export const DEVICE_FLOAT_DURATION_S = 1.2
export const DEVICE_PERSPECTIVE_PX = 1200
/** Largest tilt on either axis from scroll, and the cap on scroll plus pointer combined. */
export const DEVICE_SCROLL_TILT_DEG = 6
export const DEVICE_POINTER_TILT_DEG = 4
export const DEVICE_TILT_EASE_S = 0.6

// Parallax: layers drift by depth times this range over their pass through the viewport.
export const PARALLAX_RANGE_PX = 160
export const PARALLAX_MIN_DEPTH = 0.05
export const PARALLAX_MAX_DEPTH = 0.3
