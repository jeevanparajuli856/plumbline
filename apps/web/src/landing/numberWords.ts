const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]

/** A count from data, spelled for prose ("four rungs"); digits once the word list runs out. */
export function countWord(n: number, capitalized = false): string {
  const word = WORDS[n] ?? String(n)
  return capitalized ? word.charAt(0).toUpperCase() + word.slice(1) : word
}
