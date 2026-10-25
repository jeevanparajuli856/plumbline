/**
 * Copy that carries a number or a quote. Each string here is checked against its source document
 * by content.test.ts, so the landing cannot drift from docs/EVIDENCE.md, docs/POSITIONING.md and
 * docs/BUILD_PLAN.md. Fixture numbers never live here; they come from workedExample.ts.
 */
import { parseTables, tableUnder, type MarkdownTable } from './markdownTables'

/** Used verbatim wherever status is shown (POSITIONING section 1). */
export const STATUS_LINE = 'Simulation validated. User validation in progress.'
/** Used verbatim wherever the product is named (POSITIONING section 1). */
export const PRODUCT_LINE = 'Truehand for iPhone and the web. Try the web app today.'
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

export const FORUM_QUOTE = {
  text: "He can't see the probes",
  source: 'EEVblog forum, 2014, thread on a talking multimeter for a blind engineer',
}

/** EVIDENCE.md section 4, in plain words (no threshold on the site): the result that would change our minds. */
export const KILL_RESULT =
  'if real hands almost always land where they are told, a conventional assistant is already enough, and we will say so.'

/** Scope of every result on the page. Names no partner (rule F21) until permission is on file. */
export const SIMULATION_SCOPE =
  'Results on this page come from simulated faults and a simulated hand. We have not yet measured how real hands miss. That measurement is being scheduled with the Louisiana Center for the Blind.'

export const SAFETY_SCOPE =
  'Not a safety device. Do not use it to work on mains voltage or anything that can hurt you.'

/** What changes for the user (Home, outcomes). Says what Truehand does, never how. */
export const OUTCOMES: readonly { name: string; sentence: string }[] = [
  {
    name: 'Told where to probe',
    sentence: 'Truehand names the next row to measure, in words, and waits for your reading.',
  },
  {
    name: 'Warned when the probe slipped',
    sentence:
      'When a reading says the probe touched a different row, you hear it at once, with the row it most likely touched.',
  },
  {
    name: 'Never handed a guess',
    sentence:
      'When two faults read the same everywhere it can measure, it says so and asks for another measurement.',
  },
]

/** The app's three modes (POSITIONING section 2, The app). Tags say where the readings come from. */
export const MODES: readonly { name: string; sentence: string; tag: string }[] = [
  {
    name: 'Live meter',
    sentence:
      'Use your own talking multimeter. Truehand tells you where to probe, you say or type the reading, and it answers.',
    tag: 'Your meter',
  },
  {
    name: 'Recorded replays',
    sentence:
      'Step through real recorded sessions, one reading at a time, to learn what a warning sounds like before you need one.',
    tag: 'Recorded runs',
  },
  {
    name: 'Simulation',
    sentence:
      'Practice and demonstrate with a simulated circuit and a simulated hand. Every screen in this mode says simulated.',
    tag: 'Simulated hand',
  },
]

/** Who buys Truehand (The app, buyers). Roles only, no organization names. */
export const BUYERS: readonly { name: string; sentence: string }[] = [
  {
    name: 'Schools and training programs',
    sentence:
      'Electronics classes for blind and low-vision students, and the agencies that fund their tools.',
  },
  {
    name: 'Employers',
    sentence: 'Workplaces that need a technician to measure on their own, as a job accommodation.',
  },
  {
    name: 'Pilot partners',
    sentence:
      'Blindness organizations and instructors who want to try Truehand with their students first.',
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
  /** Short public provenance label; the file stays in `path` and in docs/EVIDENCE.md. */
  source: string
  /** The run file the value comes from. Tests trace it; the page never prints it. */
  path: string | null
  /** false only for the cell that waits on user validation. */
  isSimulated: boolean
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "October 2026" from an ISO date, or "undated". */
export function monthLabel(isoDate: string | null | undefined): string {
  const [year, month] = (isoDate ?? '').split('-')
  const name = MONTHS[Number(month) - 1]
  return year && name ? `${name} ${year}` : 'undated'
}

/** Runs in a file: seeds x faults per seed, from the "- Seeds" line. */
export function runCount(file: ResultFile | null): number | null {
  const m = /^- Seeds: \[([^\]]*)\]; n per arm per seed: (\d+)/m.exec(file?.markdown ?? '')
  if (!m) return null
  const seeds = m[1]!.split(',').filter((x) => x.trim() !== '').length
  return seeds * Number(m[2])
}

/** The short public label (POSITIONING section 3): "Simulated, 1,500 runs, October 2026". */
export function sourceLabel(file: ResultFile | null): string {
  if (!file) return 'Simulated. Run not recorded yet.'
  const runs = runCount(file)
  const when = monthLabel(file.generated)
  return `Simulated, ${runs === null ? 'unknown' : runs.toLocaleString('en-US')} runs, ${when}`
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
      source: sourceLabel(stability),
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
          ? 'confidently wrong. The conventional assistant on the same faults is not recorded in that run.'
          : `confidently wrong, against ${publishedWrong}% for a conventional assistant on the same faults.`,
      source: sourceLabel(stability),
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
      source: sourceLabel(mismatch),
      path: mismatch?.path ?? 'docs/results/mismatch_<date>.md',
      isSimulated: true,
    },
    {
      id: 'real-hands',
      value: null,
      decimals: 0,
      suffix: '',
      label:
        'How real blind hands miss, measured with blind participants. No participant results yet.',
      source: 'Scheduled with the Louisiana Center for the Blind.',
      path: null,
      isSimulated: false,
    },
  ]
}

export const VALIDATION_STATS: readonly ValidationStat[] = buildValidationStats(RESULT_FILES)
