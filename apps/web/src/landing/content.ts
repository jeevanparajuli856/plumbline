/**
 * Copy that carries a number or a quote. Each string here is checked against its source document
 * by content.test.ts, so the landing cannot drift from docs/EVIDENCE.md, docs/POSITIONING.md and
 * docs/BUILD_PLAN.md. Fixture numbers never live here; they come from workedExample.ts.
 */

/** Used verbatim wherever status is shown (POSITIONING section 1). */
export const STATUS_LINE = 'Simulation validated. User validation in progress.'
/** Used verbatim wherever the product is named (POSITIONING section 1). */
export const PRODUCT_LINE = 'Web simulator open now. iOS app next.'
export const PROMISE = 'It cannot tell you something it has not measured.'

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
  'Results on this page come from simulated faults and a simulated hand. We have not yet measured how real hands miss. That measurement is the next phase.'

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
  { name: 'Engine', when: 'Oct 26 to Nov 1', state: 'in-progress' },
  { name: 'Simulation', when: 'Nov 2 to 8', state: 'in-progress' },
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
