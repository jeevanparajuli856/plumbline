/**
 * Session store contract (frozen after bootstrap; change only through an integration lane).
 * Vocabulary: `site` is a probe site (breadboard row or thermometer depth band), 0-based in
 * arrays and labeled 1-based for people via `catalog.sites[i].label`.
 */
export type DomainId = 'circuit' | 'thermometer'
export type Mode = 'simulate' | 'live' | 'replay'
export type EngineSource = 'api' | 'replay' | 'local'
export type Phase =
  | 'idle'
  | 'starting'
  | 'awaiting_reading'
  | 'submitting'
  | 'revealing'
  | 'resolved'
  | 'unresolved'
  | 'error'
export type Site = number
export type HypothesisId = string
export type ReadingSource = 'typed' | 'voice' | 'simulated' | 'replay'

export interface SiteSpec {
  index: Site
  label: string
  spoken: string
}

export interface HypothesisMeta {
  id: HypothesisId
  label: string
  spoken: string
  description: string
}

export interface Catalog {
  domain: DomainId
  simulated: boolean
  readingUnit: string
  sigma: number
  hypotheses: HypothesisMeta[]
  sites: SiteSpec[]
  classes: HypothesisId[][]
}

export interface DomainSpec {
  id: DomainId
  title: string
  simulated: boolean
  siteNoun: string
  unit: string
  unitSpoken: string
  readingDecimals: number
  readingRange: [number, number]
  phrases: {
    instruction: (site: SiteSpec) => string
    accepted: (value: number) => string
    warning: (told: SiteSpec, likely: SiteSpec, pOff: number) => string
    likely: (likely: SiteSpec, p: number) => string
    diagnosis: (fault: HypothesisMeta, confidence: number) => string
    unresolved: (pair: HypothesisMeta[]) => string
  }
}

export interface Instruction {
  site: Site
  label: string
  spoken: string
  gainBits: number[]
}

export interface Warning {
  toldSite: Site
  likelySite: Site
  pOffSite: number
  text: string
}

export interface Diagnosis {
  hypothesisId: HypothesisId
  label: string
  confidence: number
  spoken: string
}

export interface Unresolved {
  classes: HypothesisId[][]
  reason: 'indistinguishable' | 'no_informative_site' | 'max_steps'
  text: string
}

export interface BaselineState {
  method: string
  belief: number[]
  diagnosis: Diagnosis | null
}

export interface ReadingEntry {
  step: number
  toldSite: Site
  value: number
  source: ReadingSource
  landedSite?: Site
  placement: number[]
  warning: Warning | null
  entropyBits: number
  top: Array<{ hypothesisId: HypothesisId; p: number }>
  acceptedAt: number
}

export interface Reveal {
  landedSite: Site
  token: number
  next: 'awaiting_reading' | 'resolved' | 'unresolved'
}

export type SessionErrorCode =
  | 'api_unreachable'
  | 'api_waking'
  | 'api_error'
  | 'bad_reading'
  | 'not_next_in_replay'
  | 'fixture_missing'
  | 'session_lost'
  | 'webgl_lost'

export interface SessionError {
  code: SessionErrorCode
  sentence: string
  canRetry: boolean
  resumePhase: Phase
}

export interface ReplayState {
  fixtureId: string
  stepIndex: number
  totalSteps: number
  autoplay: boolean
  paceMs: number
  silent: boolean
  provisional: boolean
}

export type ApiHealth = 'unknown' | 'ok' | 'waking' | 'down'

export interface StartOptions {
  domain?: DomainId
  mode: Mode
  seed?: number
  trueHypothesis?: HypothesisId
  fixture?: string
  silent?: boolean
}

export interface SessionData {
  domain: DomainId
  mode: Mode
  engineSource: EngineSource
  sessionId: string | null
  phase: Phase
  instruction: Instruction | null
  aimedSite: Site | null
  readings: ReadingEntry[]
  belief: number[]
  entropyBits: number
  maxEntropyBits: number
  placement: number[]
  warning: Warning | null
  diagnosis: Diagnosis | null
  unresolved: Unresolved | null
  baseline: BaselineState | null
  catalog: Catalog | null
  reveal: Reveal | null
  replay: ReplayState | null
  error: SessionError | null
  apiHealth: ApiHealth
}

export interface SessionActions {
  start(opts: StartOptions): Promise<void>
  aimProbe(site: Site): void
  submitReading(value: number, source: ReadingSource): Promise<void>
  finishReveal(token: number): void
  replayNext(): Promise<void>
  replayPlay(paceMs?: number): void
  replayPause(): void
  retry(): Promise<void>
  reset(): Promise<void>
  setApiHealth(health: ApiHealth): void
}

export type SessionState = SessionData & SessionActions
