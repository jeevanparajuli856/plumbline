import type { DomainSpec } from '@/state/types'

/**
 * Spoken or recognized text -> one reading. Transcripts are data: they are tokenized against
 * fixed word tables and never evaluated. Ambiguity is an error, not a guess.
 */
export type ReadingUnit = 'V' | 'mV' | '°C'
export type ParseErrorCode =
  | 'empty'
  | 'no_number'
  | 'unrecognized'
  | 'ambiguous'
  | 'wrong_unit'
  | 'out_of_range'
/** `needsConfirm`: a run of single digits ("one two") may hide a dropped "point"; never submit it unasked. */
export type ParseResult = { value: number; unit?: ReadingUnit; needsConfirm?: true } | { error: ParseErrorCode }
export type ParseSpec = Pick<DomainSpec, 'unit' | 'readingRange'>

const MILLI = 1000

const ONES: Record<string, number> = {
  zero: 0, nought: 0, one: 1, two: 2, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9,
}
const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
/** Common mis-hearings, trusted only next to another number token. */
const HOMOPHONES: Record<string, string> = { to: 'two', too: 'two', for: 'four', oh: 'zero', o: 'zero' }
const UNITS: Record<string, ReadingUnit> = {
  v: 'V', volt: 'V', volts: 'V',
  mv: 'mV', millivolt: 'mV', millivolts: 'mV',
  c: '°C', degree: '°C', degrees: '°C', celsius: '°C', centigrade: '°C',
}
const FOREIGN_UNITS = new Set(['f', 'fahrenheit', 'kelvin', 'amps', 'amp', 'ohms', 'ohm'])
const SIGNS = new Set(['minus', 'negative'])
const POINTS = new Set(['point', 'dot', '.'])
const FILLER = new Set([
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'hmm', 'ah', 'so', 'well', 'ok', 'okay', 'and', 'a',
  'it', 'its', 'is', 'says', 'say', 'reads', 'read', 'reading', 'shows', 'showing', 'the',
  'meter', 'multimeter', 'display', 'i', 'got', 'get', 'see', 'about', 'like', 'thats', 'that',
  'was', 'now', 'please', 'exactly', 'approximately', 'around', 'temperature', 'thermometer',
])
const DOMAIN_UNITS: Record<string, readonly ReadingUnit[]> = { V: ['V', 'mV'], '°C': ['°C'] }

type Token =
  | { kind: 'digits'; text: string }
  | { kind: 'word'; text: string }
  | { kind: 'point' }
  | { kind: 'sign' }
  | { kind: 'unit'; unit: ReadingUnit }

export function parseReading(transcript: string, spec: ParseSpec): ParseResult {
  const words = normalize(transcript)
  if (words.length === 0) return { error: 'empty' }
  if (words.some((w) => FOREIGN_UNITS.has(w))) return { error: 'wrong_unit' }
  const tokens = classify(words)
  if (tokens === null) return { error: 'unrecognized' }
  const units = new Set(tokens.flatMap((t) => (t.kind === 'unit' ? [t.unit] : [])))
  if (units.size > 1) return { error: 'ambiguous' }
  const [unit] = units
  if (unit && !(DOMAIN_UNITS[spec.unit] ?? []).includes(unit)) return { error: 'wrong_unit' }
  const groups = splitGroups(tokens)
  if (groups.length === 0) return { error: 'no_number' }
  if (groups.length > 1) return { error: 'ambiguous' }
  const parsed = parseGroup(groups[0] ?? [])
  if ('error' in parsed) return parsed
  const scaled = unit === 'mV' ? parsed.value / MILLI : parsed.value
  const value = scaled === 0 ? 0 : scaled
  const [lo, hi] = spec.readingRange
  if (!Number.isFinite(value) || value < lo || value > hi) return { error: 'out_of_range' }
  const needsConfirm = parsed.isDigitRun && unit !== 'mV'
  return { value, ...(unit ? { unit } : {}), ...(needsConfirm ? { needsConfirm: true as const } : {}) }
}

function normalize(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/°\s*c\b/g, ' degrees celsius ')
    .replace(/°/g, ' degrees ')
    .replace(/'/g, '')
    .replace(/(^|\s)-(?=[\d.])/g, '$1 minus ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

function isNumberWord(word: string): boolean {
  return word in ONES || word in TEENS || word in TENS || word === 'hundred' || word === 'thousand'
}

function classifyOne(word: string): Token | 'filler' | 'homophone' | null {
  if (/^\d*\.?\d+$/.test(word)) return { kind: 'digits', text: word }
  if (isNumberWord(word)) return { kind: 'word', text: word }
  if (POINTS.has(word)) return { kind: 'point' }
  if (SIGNS.has(word)) return { kind: 'sign' }
  const unit = UNITS[word]
  if (unit) return { kind: 'unit', unit }
  if (word in HOMOPHONES) return 'homophone'
  if (FILLER.has(word)) return 'filler'
  return null
}

function isNumeric(token: Token | 'filler' | 'homophone' | null | undefined): boolean {
  return typeof token === 'object' && token !== null && ['digits', 'word', 'point'].includes(token.kind)
}

/** Null when a word is unknown. Homophones count as numbers only beside a number token. */
function classify(words: string[]): Token[] | null {
  const raw = words.map(classifyOne)
  if (raw.includes(null)) return null
  const tokens: Token[] = []
  raw.forEach((token, i) => {
    if (token === 'filler') return
    if (token === 'homophone') {
      const word = words[i] ?? ''
      if (isNumeric(raw[i - 1]) || isNumeric(raw[i + 1])) tokens.push({ kind: 'word', text: HOMOPHONES[word] ?? word })
      return
    }
    if (token) tokens.push(token)
  })
  return tokens
}

/** Units separate numbers; two separate numbers in one utterance are ambiguous. */
function splitGroups(tokens: Token[]): Token[][] {
  const groups: Token[][] = []
  let current: Token[] = []
  for (const token of tokens) {
    if (token.kind === 'unit') {
      if (current.length > 0) groups.push(current)
      current = []
    } else current.push(token)
  }
  if (current.length > 0) groups.push(current)
  return groups
}

function parseGroup(group: Token[]): { value: number; isDigitRun: boolean } | { error: ParseErrorCode } {
  const negative = group[0]?.kind === 'sign'
  const body = negative ? group.slice(1) : group
  if (body.some((t) => t.kind === 'sign')) return { error: 'ambiguous' }
  const expanded = body.flatMap(splitDecimal)
  const points = expanded.filter((t) => t.kind === 'point').length
  if (points > 1) return { error: 'ambiguous' }
  const at = expanded.findIndex((t) => t.kind === 'point')
  const intTokens = at === -1 ? expanded : expanded.slice(0, at)
  const fracTokens = at === -1 ? [] : expanded.slice(at + 1)
  if (at !== -1 && fracTokens.length === 0) return { error: 'no_number' }
  if (intTokens.length === 0 && fracTokens.length === 0) return { error: 'no_number' }
  const int = intTokens.length === 0 ? { digits: '0', isDigitRun: false } : integerDigits(intTokens)
  const fracDigits = fractionDigits(fracTokens)
  if (int === null || fracDigits === null) return { error: 'ambiguous' }
  const magnitude = Number(fracDigits ? `${int.digits}.${fracDigits}` : int.digits)
  return { value: negative ? -magnitude : magnitude, isDigitRun: int.isDigitRun }
}

function splitDecimal(token: Token): Token[] {
  if (token.kind !== 'digits' || !token.text.includes('.')) return [token]
  const [whole = '', frac = ''] = token.text.split('.')
  const head: Token[] = whole ? [{ kind: 'digits', text: whole }] : []
  return [...head, { kind: 'point' }, { kind: 'digits', text: frac }]
}

type WordKind = 'none' | 'ones' | 'teens' | 'tens' | 'hundred' | 'thousand'

/** "three hundred thirty eight" -> "338"; "three three eight" -> "338"; invalid order -> null. */
function integerDigits(tokens: Token[]): { digits: string; isDigitRun: boolean } | null {
  const [first] = tokens
  if (tokens.length === 1 && first?.kind === 'digits') return { digits: first.text, isDigitRun: false }
  if (tokens.some((t) => t.kind !== 'word')) return null
  const words = tokens.map((t) => (t.kind === 'word' ? t.text : ''))
  if (words.length > 1 && words.every((w) => w in ONES)) {
    return { digits: words.map((w) => String(ONES[w])).join(''), isDigitRun: true }
  }
  let total = 0
  let current = 0
  let last: WordKind = 'none'
  for (const word of words) {
    const ones = ONES[word]
    const teens = TEENS[word] ?? TENS[word]
    if (ones !== undefined) {
      if (last === 'ones' || last === 'teens') return null
      current += ones
      last = 'ones'
    } else if (teens !== undefined) {
      if (last !== 'none' && last !== 'hundred' && last !== 'thousand') return null
      current += teens
      last = word in TENS ? 'tens' : 'teens'
    } else if (word === 'hundred') {
      if (last === 'hundred') return null
      current = (current || 1) * 100
      last = 'hundred'
    } else {
      total += (current || 1) * 1000
      current = 0
      last = 'thousand'
    }
  }
  return { digits: String(total + current), isDigitRun: false }
}

/** Fraction digits are read one by one; "sixty seven" after the point reads as "67". */
function fractionDigits(tokens: Token[]): string | null {
  let digits = ''
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token?.kind === 'digits') {
      digits += token.text
      continue
    }
    if (token?.kind !== 'word') return null
    const ones = ONES[token.text]
    const teens = TEENS[token.text]
    const tens = TENS[token.text]
    if (ones !== undefined) digits += String(ones)
    else if (teens !== undefined) digits += String(teens)
    else if (tens !== undefined) {
      const next = tokens[i + 1]
      const nextOnes = next?.kind === 'word' ? ONES[next.text] : undefined
      digits += nextOnes !== undefined && nextOnes > 0 ? String(tens + nextOnes) : String(tens)
      if (nextOnes !== undefined && nextOnes > 0) i += 1
    } else return null
  }
  return digits
}
