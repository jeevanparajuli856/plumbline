/**
 * Copy that carries a number or a quote. Each string here is checked against its source document
 * by content.test.ts, so the landing cannot drift from docs/EVIDENCE.md, docs/POSITIONING.md and
 * docs/BUILD_PLAN.md. Fixture numbers never live here; they come from workedExample.ts.
 */
import { parseTables, tableUnder, type MarkdownTable } from './markdownTables'

/** Used verbatim wherever status is shown (POSITIONING section 1). */
export const STATUS_LINE = 'Simulation validated. User validation in progress.'
/** Used verbatim wherever the product is named (POSITIONING section 1). */
export const PRODUCT_LINE = 'Web simulator open now. iOS app next.'
export const PROMISE = 'It cannot tell you something it has not measured.'

/** The idea the Truehand mark is built on (POSITIONING section 1.1, ADR-0013). */
export const BRAND_IDEA =
  'A braille cell and a breadboard are the same shape. Both are grids of dots, read by fingertip, where every hole feels identical to the one beside it.'
/** Truehand "works out", never "knows" (POSITIONING section 1.1). */
export const FOUND_LINE = 'Truehand works out which hole your probe actually found'
export const CONTACT_EMAIL = 'support@truehand.tech'

export interface Study {
  id: string
  venue: string
  institution: string
  title: string
  /** Participant count as EVIDENCE.md states it. */
  participants: number
  participantPhrase: string
  quote: string
  speaker: string
}

/** EVIDENCE.md section 2, studies 1 to 3. */
export const STUDIES: readonly Study[] = [
  {
    id: 'say-it-my-way',
    venue: 'CHI 2026',
    institution: 'University of Maryland',
    title: 'Say It My Way',
    participants: 11,
    participantPhrase: '11 blind participants',
    quote: 'the only way to make sure that it was 100% correct.',
    speaker: 'A participant checking bread dough, who split the task into small separate questions',
  },
  {
    id: 'misfitting',
    venue: 'ASSETS 2024',
    institution: 'University of Michigan',
    title: 'Misfitting With AI',
    participants: 26,
    participantPhrase: '26 blind adults',
    quote:
      'sometimes I wonder whether or not the inaccuracy is really more my picture taking skills.',
    speaker: 'Participant 23',
  },
  {
    id: 'stony-brook',
    venue: 'arXiv 2602.18623',
    institution: 'Stony Brook University',
    title: 'Preprint, February 2026',
    participants: 14,
    participantPhrase: '14 blind users',
    quote:
      'contain fabricated information, or contradict themselves and ignore instructions, which made users verify more.',
    speaker: 'The authors, summarizing what participants reported',
  },
]

export const TOTAL_PARTICIPANTS = STUDIES.reduce((sum, s) => sum + s.participants, 0)

export interface PriorArt {
  name: string
  what: string
  gap: string
}

/** POSITIONING section 2 and PITCH section 6. */
export const PRIOR_ART: readonly PriorArt[] = [
  {
    name: 'Gao et al., 2014',
    what: 'Picks the next test point by information gain over a fault dictionary.',
    gap: 'Assumes the test point you asked for is the one measured.',
  },
  {
    name: 'Sequential diagnosis with unreliable tests, IEEE 2019',
    what: 'Treats each test as a black box with false positive and false negative rates.',
    gap: 'The noise is on the outcome; which test ran is never in doubt.',
  },
  {
    name: 'de Kleer and Williams, 1987',
    what: 'Diagnoses from a model of correct behavior and observed discrepancies.',
    gap: 'Observations are attributed to the intended probe location.',
  },
]

export const DIFFERENCE =
  'Those model sensor noise. We model actuator noise with a recoverable hidden state.'

export const FORUM_QUOTE = {
  text: "He can't see the probes",
  source: 'EEVblog forum, 2014, thread on a talking multimeter for a blind engineer',
}

/** EVIDENCE.md section 4: the result that would end the project, stated before anyone asks. */
export const KILL_RESULT =
  'if measured placement accuracy is above 0.95, the published method is already sufficient.'

/** Scope of every result on the page. Names no partner (rule F21) until permission is on file. */
export const SIMULATION_SCOPE =
  'Results on this page come from simulated faults and a simulated hand. We have not yet measured how real hands miss. That measurement is being scheduled with the Louisiana Center for the Blind.'

export const SAFETY_SCOPE =
  'Research preview. Not a safety device. Do not use it to work on mains voltage or anything that can hurt you.'

export type PhaseState = 'done' | 'in-progress' | 'now' | 'next'

export interface Phase {
  name: string
  when: string
  state: PhaseState
}

/** Phase chips (POSITIONING section 2). Dates from docs/BUILD_PLAN.md; undated phases say so. */
export const PHASES: readonly Phase[] = [
  { name: 'Research', when: 'Oct 25', state: 'done' },
  { name: 'Engine', when: 'Oct 26 to Nov 1', state: 'done' },
  { name: 'Simulation', when: 'Oct 26 to Nov 8', state: 'done' },
  { name: 'User validation', when: 'date to be booked', state: 'now' },
  { name: 'Pilot', when: 'date to be set', state: 'next' },
  { name: 'Product', when: 'Nov 23 to Dec 6', state: 'next' },
]

export interface TeamMember {
  name: string
  role: string
}

export const TEAM: readonly TeamMember[] = [
  { name: 'Jeevan Parajuli', role: 'Engine rebuild and the web simulator' },
  { name: 'Pankaj Bhatta', role: 'The original inference engine and experiments' },
]
export const UNIVERSITY = 'University of Louisiana Monroe'

/** The three products, in the order they ship. Status words follow docs/EVIDENCE.md. */
export const PRODUCTS: readonly { name: string; sentence: string; status: string }[] = [
  {
    name: 'Web simulator',
    sentence:
      'The whole instrument in a browser: the circuit, the simulated thermometer and recorded replays.',
    status: 'Open now',
  },
  {
    name: 'Voice channel',
    sentence:
      'Hear the instruction, say the reading, hear the warning. Speech stays off until you turn it on.',
    status: 'In progress',
  },
  {
    name: 'iOS app',
    sentence: 'The same web app wrapped for the phone, so its screen reader speaks every state.',
    status: 'Next',
  },
]

/* ---------- Validation stats, read from the newest run files in docs/results ---------- */

const RESULT_FILES = import.meta.glob(
  ['@docs/results/stability_*.md', '@docs/results/mismatch_*.md'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

export interface ResultFile {
  /** Path from the repo root, e.g. docs/results/stability_2026-10-25.md */
  path: string
  markdown: string
  /** Date part of the "Generated:" line. */
  generated: string | null
}

/** The newest file for an experiment; names carry the date, so the last one sorted wins. */
export function latestResult(files: Record<string, string>, experiment: string): ResultFile | null {
  const key = Object.keys(files)
    .filter((k) => k.includes(`/results/${experiment}_`))
    .sort()
    .at(-1)
  if (!key) return null
  const markdown = files[key]!
  return {
    path: `docs/results/${key.split('/').at(-1)}`,
    markdown,
    generated: /^- Generated: (\d{4}-\d{2}-\d{2})/m.exec(markdown)?.[1] ?? null,
  }
}

/** The leading number of a cell such as "99.5 ± 0.4" or "82.7". */
export function leadingNumber(cell: string | undefined): number | null {
  const m = /^-?\d+(?:\.\d+)?/.exec((cell ?? '').trim())
  return m ? Number(m[0]) : null
}

/** One method's value in the column whose header starts with `column`. */
export function cellFor(
  table: MarkdownTable | null,
  method: string,
  column: string,
): number | null {
  if (!table) return null
  const col = table.headers.findIndex((h) => h.startsWith(column))
  const row = table.rows.find((r) => r[0] === method)
  return col < 0 || !row ? null : leadingNumber(row[col])
}

export interface ValidationStat {
  id: string
  /** null when the run file or its row is missing; the cell then says so and never animates. */
  value: number | null
  decimals: number
  suffix: string
  label: string
  source: string
  /** The run file the value should come from, for the "Not recorded in" fallback. */
  path: string | null
  /** false only for the cell that waits on user validation. */
  isSimulated: boolean
}

/** "5 seeds x 300 faults" from the run file's "- Seeds: [...]; n per arm per seed: N" line. */
export function runScope(file: ResultFile | null): string | null {
  const m = /^- Seeds: \[([^\]]*)\]; n per arm per seed: (\d+)/m.exec(file?.markdown ?? '')
  if (!m) return null
  const seeds = m[1]!.split(',').filter((x) => x.trim() !== '').length
  return `${seeds} ${seeds === 1 ? 'seed' : 'seeds'} x ${m[2]} faults`
}

function sourceOf(file: ResultFile | null, scenario = ''): string {
  if (!file) return 'Run file missing.'
  const scope = [scenario, runScope(file)].filter(Boolean).join(', ')
  return `${file.path}, run ${file.generated ?? 'undated'}, ${scope}. Simulated.`
}

/** Plain names for the mismatch scenarios; unknown ones show their name from the file. */
const SCENARIO_PHRASE: Record<string, string> = {
  lopsided: 'slips skewed to one side',
  three_row_jumps: 'occasional three-row jumps',
  bridging: 'a probe that sometimes bridges two rows',
  poor_contact: 'a probe that sometimes makes no contact',
}

export interface StressResult {
  scenario: string
  correct: number
}

/** The mismatch scenario where Truehand is correct least often, read from every section of the file. */
export function worstScenario(markdown: string): StressResult | null {
  return parseTables(markdown)
    .map((t) => ({ scenario: t.heading, correct: cellFor(t, 'truehand', 'Correct %') }))
    .filter((r): r is StressResult => r.correct !== null && r.scenario !== '')
    .reduce<StressResult | null>(
      (worst, r) => (worst && worst.correct <= r.correct ? worst : r),
      null,
    )
}

/** The four validation cells: three simulated results from our own runs and one that waits on people. */
export function buildValidationStats(files: Record<string, string>): ValidationStat[] {
  const stability = latestResult(files, 'stability')
  const mismatch = latestResult(files, 'mismatch')
  const table = stability ? tableUnder(stability.markdown, 'Stability') : null
  const worst = mismatch ? worstScenario(mismatch.markdown) : null
  const publishedWrong = cellFor(table, 'entropy_exact', 'Confidently wrong %')
  return [
    {
      id: 'correct',
      value: cellFor(table, 'truehand', 'Correct %'),
      decimals: 1,
      suffix: '%',
      label: 'of simulated faults end on the true fault or an honest refusal, mean over seeds.',
      source: sourceOf(stability),
      path: stability?.path ?? 'docs/results/stability_<date>.md',
      isSimulated: true,
    },
    {
      id: 'confidently-wrong',
      value: cellFor(table, 'truehand', 'Confidently wrong %'),
      decimals: 1,
      suffix: '%',
      label:
        publishedWrong === null
          ? 'confidently wrong. The published method on the same faults is not recorded in that run.'
          : `confidently wrong, against ${publishedWrong}% for the published method on the same faults.`,
      source: sourceOf(stability),
      path: stability?.path ?? 'docs/results/stability_<date>.md',
      isSimulated: true,
    },
    {
      id: 'stress',
      value: worst?.correct ?? null,
      decimals: 1,
      suffix: '%',
      label: worst
        ? `correct in the hardest of our stress tests, ${SCENARIO_PHRASE[worst.scenario] ?? worst.scenario.replace(/_/g, ' ')}: the lowest score in that run.`
        : 'correct in the hardest of our stress tests.',
      source: sourceOf(mismatch, worst ? `${worst.scenario.replace(/_/g, ' ')} scenario` : ''),
      path: mismatch?.path ?? 'docs/results/mismatch_<date>.md',
      isSimulated: true,
    },
    {
      id: 'real-hands',
      value: null,
      decimals: 0,
      suffix: '',
      label:
        'How real blind hands miss: the measured placement matrix that replaces the assumed one. No participant results yet.',
      source: 'docs/EVIDENCE.md, readiness row "Measured confusion matrix". Date to be booked.',
      path: null,
      isSimulated: false,
    },
  ]
}

export const VALIDATION_STATS: readonly ValidationStat[] = buildValidationStats(RESULT_FILES)
