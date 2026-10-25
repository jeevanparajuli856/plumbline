/** Every tween runs only under this query; reduced motion matches nothing and keeps the static final state. */
export const MOTION_ALLOWED = '(prefers-reduced-motion: no-preference)'
/** Width from which the technology race pins its section while it scrubs. */
export const PIN_MIN_WIDTH_PX = 768
export const MOTION_WIDE = `${MOTION_ALLOWED} and (min-width: ${PIN_MIN_WIDTH_PX}px)`
export const MOTION_NARROW = `${MOTION_ALLOWED} and (max-width: ${PIN_MIN_WIDTH_PX - 1}px)`

/** Where a once-only reveal fires: the element's top crosses this point of the viewport. */
export const REVEAL_START = 'top 85%'

// Headline: rises word by word on load.
export const HEADLINE_RISE_PERCENT = 40
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
export const BARS_SCROLL_LENGTH = '+=150%'
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

// Plumb: bob follows the page, the line swings and settles as belief converges.
/** Full swing period. 0.3 Hz, far from the 3 Hz flash threshold. */
export const SWING_PERIOD_S = 3.2
export const MAX_SWING_DEG = 2.5
/** Fraction of the gap to the target amplitude closed on each ticker frame. */
export const SWING_EASE_PER_FRAME = 0.06
