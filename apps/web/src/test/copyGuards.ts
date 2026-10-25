/** Copy tropes from docs/POSITIONING.md section 4.3, checked on our strings and the rendered page. */
export const TROPES: ReadonlyArray<readonly [string, RegExp]> = [
  ['em-dash', /\u2014/],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['exclamation mark', /!/],
  ["it's not X, it's Y", /\bit(?:'|\u2019)?s not\b[^.]{0,60}[,;]\s*it(?:'|\u2019)?s\b/i],
  ['not just', /\bnot just\b/i],
  [
    'buzzword',
    /\b(revolutionary|game-changing|seamless(?:ly)?|cutting-edge|next-gen|unlock|empower|supercharge|leverage|synergy|world-class|effortless(?:ly)?)\b/i,
  ],
]

/**
 * Words and shapes that would disclose the method on the public site (POSITIONING section 3,
 * ADR-0014): formula symbols, model numbers, internals, commands and commit hashes.
 */
export const METHOD_WORDS: ReadonlyArray<readonly [string, RegExp]> = [
  ['formula symbol', /[\u03a3\u221d\u2260\u2211]|argmax|P\(l\b|P\(r\b/],
  ['hand-model number', /\b0\.(?:78|08|03)\b/],
  ['information gain', /information gain/i],
  ['entropy', /entropy/i],
  ['posterior', /posterior/i],
  ['confusion', /confusion/i],
  ['python file', /\.py\b/],
  ['command', /\buv run\b|pnpm |pytest/],
  ['commit hash', /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/],
  ['simulator', /simulator/i],
  ['research preview', /research preview/i],
]

/** Names that appear on /about only (ADR-0014). */
export const FOUNDER_NAMES = /Jeevan Parajuli|Pankaj Bhatta|University of Louisiana Monroe/
