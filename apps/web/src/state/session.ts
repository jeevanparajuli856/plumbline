import { create } from 'zustand'
import { ApiClient } from '@/engine/api'
import { chooseClient, EngineError, type EngineClient, type StartRequest } from '@/engine/client'
import type { CatalogViewT, SessionViewT, StepViewT } from '@/engine/schemas'
import { prefersReducedMotion } from '@/a11y/useReducedMotion'
import { webglSupported } from '@/lib/webgl'
import { DOMAINS } from './domains'
import { ReplayClient } from './replay'
import type {
  Catalog,
  Phase,
  ReadingEntry,
  ReadingSource,
  SessionData,
  SessionError,
  SessionState,
  StartOptions,
  Warning,
} from './types'

export const TOP_K = 3
const DEFAULT_PACE_MS = 1800
/** Seed used when the caller does not choose one, so a simulate run is reproducible. */
export const DEFAULT_SEED = 1

const initialData: SessionData = {
  domain: 'circuit',
  mode: 'replay',
  engineSource: 'replay',
  sessionId: null,
  phase: 'idle',
  instruction: null,
  aimedSite: null,
  readings: [],
  belief: [],
  entropyBits: 0,
  maxEntropyBits: 0,
  placement: [],
  warning: null,
  diagnosis: null,
  unresolved: null,
  baseline: null,
  catalog: null,
  reveal: null,
  replay: null,
  error: null,
  apiHealth: 'unknown',
}

export function toCatalog(view: CatalogViewT): Catalog {
  return {
    domain: view.domain,
    simulated: view.simulated,
    readingUnit: view.reading_unit,
    sigma: view.sigma,
    hypotheses: view.hypotheses,
    sites: view.sites,
    classes: view.classes,
  }
}

export function toWarning(step: StepViewT, catalog: Catalog): Warning | null {
  const w = step.placement.warning
  if (!w.active) return null
  const spec = DOMAINS[catalog.domain]
  const told = catalog.sites[step.instruction.site]
  const likely = catalog.sites[w.likely_site]
  const text =
    w.text || (told && likely ? spec.phrases.warning(told, likely, w.p_off_site) : 'Warning.')
  return { toldSite: step.instruction.site, likelySite: w.likely_site, pOffSite: w.p_off_site, text }
}

export function topK(belief: number[], catalog: Catalog, k = TOP_K): ReadingEntry['top'] {
  return belief
    .map((p, i) => ({ hypothesisId: catalog.hypotheses[i]?.id ?? String(i), p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k)
}

function errorFor(code: SessionError['code'], resumePhase: Phase): SessionError {
  const sentences: Record<SessionError['code'], string> = {
    api_unreachable:
      'The engine did not answer. The recorded worked example runs now; simulate and live return when it does.',
    api_waking:
      'The engine is waking up; free hosting sleeps after 15 minutes and takes about a minute to answer. The recorded worked example runs right now.',
    api_error: 'The engine answered with an error. You can retry.',
    bad_reading: 'That reading is outside the range this instrument can show. Check the number.',
    not_next_in_replay: 'The recording expects a different reading next. Press Next to let it play.',
    fixture_missing: 'That recording is not available here.',
    session_lost: 'The session ended. Start again to continue.',
    webgl_lost: 'The 3D view stopped. The text channel has everything.',
  }
  return { code, sentence: sentences[code], canRetry: code !== 'fixture_missing', resumePhase }
}

let client: EngineClient = new ReplayClient()
/** The request that created the current session, kept so an evicted API session can be re-created. */
let lastStartRequest: StartRequest | null = null
let revealToken = 0
let autoplayTimer: number | undefined

export function currentClient(): EngineClient {
  return client
}

/** Longest the store waits for the scene to call finishReveal before finishing it itself. */
export const REVEAL_TIMEOUT_MS = 3000
let sceneMounted = false

/** The scene calls this on mount and unmount; without a mounted scene nobody animates the reveal. */
export function setSceneMounted(mounted: boolean): void {
  sceneMounted = mounted
}

function isEvicted(error: unknown): boolean {
  return error instanceof EngineError && error.code === 'session_not_found' && client.kind === 'api'
}

function canAnimateReveal(): boolean {
  return sceneMounted && webglSupported() && !prefersReducedMotion()
}

export const useSession = create<SessionState>((set, get) => {
  const applyStart = (view: SessionViewT, opts: StartOptions, source: SessionData['engineSource']) => {
    const catalog = toCatalog(view.catalog)
    const n = catalog.hypotheses.length
    set({
      ...initialData,
      apiHealth: get().apiHealth,
      domain: view.domain,
      mode: opts.mode,
      engineSource: source,
      sessionId: view.session_id,
      phase: 'awaiting_reading',
      instruction: view.instruction
        ? { ...view.instruction, gainBits: view.instruction.gain_bits }
        : null,
      aimedSite: view.instruction?.site ?? null,
      belief: view.belief,
      entropyBits: view.entropy_bits,
      maxEntropyBits: n > 0 ? Math.log2(n) : 0,
      placement: catalog.sites.map(() => 0),
      catalog,
      replay:
        opts.mode === 'replay' && client instanceof ReplayClient && client.loaded
          ? {
              fixtureId: client.loaded.name,
              stepIndex: 0,
              totalSteps: client.loaded.steps.length,
              autoplay: false,
              paceMs: DEFAULT_PACE_MS,
              silent: opts.silent ?? false,
              provisional: client.loaded.provisional || !client.loaded.generated_by,
            }
          : null,
    })
  }

  const applyStep = (step: StepViewT, source: ReadingSource) => {
    const state = get()
    const catalog = state.catalog
    if (!catalog) return
    const warning = toWarning(step, catalog)
    const entry: ReadingEntry = {
      step: step.step_index,
      toldSite: step.instruction.site,
      value: step.reading,
      source,
      placement: step.placement.probs,
      warning,
      entropyBits: step.entropy_bits,
      top: topK(step.belief, catalog),
      acceptedAt: Date.now(),
    }
    const next: 'awaiting_reading' | 'resolved' | 'unresolved' =
      step.status === 'continue' ? 'awaiting_reading' : step.status
    const diagnosis = step.diagnosis
      ? {
          hypothesisId: step.diagnosis.hypothesis_id,
          label: step.diagnosis.label,
          confidence: step.diagnosis.confidence,
          spoken: step.diagnosis.spoken,
        }
      : null
    const baselineDiag = step.baseline.diagnosis
    set({
      readings: [...state.readings, entry],
      belief: step.belief,
      entropyBits: step.entropy_bits,
      placement: step.placement.probs,
      warning,
      diagnosis,
      unresolved: step.unresolved,
      baseline: {
        method: step.baseline.method,
        belief: step.baseline.belief,
        diagnosis: baselineDiag
          ? {
              hypothesisId: baselineDiag.hypothesis_id,
              label: baselineDiag.label,
              confidence: baselineDiag.confidence,
              spoken: baselineDiag.spoken,
            }
          : null,
      },
      instruction: step.next_instruction
        ? { ...step.next_instruction, gainBits: step.next_instruction.gain_bits }
        : null,
      aimedSite: step.next_instruction?.site ?? null,
      replay: state.replay ? { ...state.replay, stepIndex: state.replay.stepIndex + 1 } : null,
    })
    if (step.landed_site !== null) {
      revealToken += 1
      set({ phase: 'revealing', reveal: { landedSite: step.landed_site, token: revealToken, next } })
      const token = revealToken
      if (!canAnimateReveal()) get().finishReveal(token)
      // Stale tokens are ignored, so this only matters if the scene never answers.
      else setTimeout(() => get().finishReveal(token), REVEAL_TIMEOUT_MS)
    } else {
      set({ phase: next, reveal: null })
    }
  }

  /**
   * The API keeps sessions in memory with an LRU cap, so another client can evict ours. Live and
   * simulate are deterministic for the same seed and readings, so re-creating the session and
   * replaying the accepted readings restores the same belief without bothering the user.
   */
  const recreateSession = async (readings: ReadingEntry[], mode: SessionData['mode']) => {
    if (!lastStartRequest) throw new EngineError('session_lost', 'The session was lost.')
    const view = await client.start(lastStartRequest)
    for (const entry of readings) await client.step(view.session_id, mode === 'simulate' ? null : entry.value)
    return view.session_id
  }

  const fail = (error: unknown, resumePhase: Phase) => {
    const code = error instanceof EngineError ? (error.code as SessionError['code']) : 'api_error'
    const known: SessionError['code'][] = [
      'api_unreachable',
      'api_waking',
      'api_error',
      'bad_reading',
      'not_next_in_replay',
      'fixture_missing',
      'session_lost',
      'webgl_lost',
    ]
    set({ phase: 'error', error: errorFor(known.includes(code) ? code : 'api_error', resumePhase) })
  }

  return {
    ...initialData,

    async start(opts) {
      window.clearTimeout(autoplayTimer)
      const choice = chooseClient(opts.mode, get().apiHealth, false)
      client = choice.kind === 'api' ? new ApiClient() : new ReplayClient()
      set({ ...initialData, apiHealth: get().apiHealth, phase: 'starting', mode: opts.mode })
      const domain = opts.domain ?? 'circuit'
      try {
        const mode = choice.kind === 'replay' ? 'replay' : opts.mode
        const request: StartRequest = {
          domain,
          mode,
          seed: opts.seed ?? DEFAULT_SEED,
          // Live never reveals the landed site; simulate and replay reveal it after each step.
          reveal: mode === 'live' ? 'never' : 'after_step',
          ...(opts.trueHypothesis ? { true_hypothesis: opts.trueHypothesis } : {}),
          ...(opts.fixture ? { fixture: opts.fixture } : {}),
        }
        lastStartRequest = request
        const view = await client.start(request)
        applyStart(view, { ...opts, mode: choice.kind === 'replay' ? 'replay' : opts.mode }, choice.kind)
        if (choice.reason === 'api_unavailable') {
          set({ error: errorFor(get().apiHealth === 'waking' ? 'api_waking' : 'api_unreachable', 'awaiting_reading') })
        }
      } catch (error) {
        fail(error, 'idle')
      }
    },

    aimProbe(site) {
      const sites = get().catalog?.sites.length ?? 0
      if (site < 0 || site >= sites) return
      set({ aimedSite: site })
    },

    async submitReading(value, source) {
      const state = get()
      if (state.phase !== 'awaiting_reading' || !state.sessionId || !state.catalog) return
      const [lo, hi] = DOMAINS[state.domain].readingRange
      if (!Number.isFinite(value) || value < lo || value > hi) {
        set({ phase: 'error', error: errorFor('bad_reading', 'awaiting_reading') })
        return
      }
      set({ phase: 'submitting', error: null })
      const reading = state.mode === 'simulate' ? null : value
      try {
        const step = await client.step(state.sessionId, reading)
        applyStep(step, source)
      } catch (error) {
        if (!isEvicted(error)) return fail(error, 'awaiting_reading')
        try {
          const sessionId = await recreateSession(state.readings, state.mode)
          set({ sessionId })
          applyStep(await client.step(sessionId, reading), source)
        } catch (retryError) {
          fail(retryError, 'awaiting_reading')
        }
      }
    },

    finishReveal(token) {
      const { reveal, readings } = get()
      if (!reveal || reveal.token !== token) return
      const last = readings[readings.length - 1]
      const updated = last ? [...readings.slice(0, -1), { ...last, landedSite: reveal.landedSite }] : readings
      set({ readings: updated, phase: reveal.next, reveal: null })
    },

    async replayNext() {
      const state = get()
      if (!(client instanceof ReplayClient) || state.phase !== 'awaiting_reading' || !state.sessionId) return
      const expected = client.expectedReading()
      if (expected === null) return
      set({ phase: 'submitting', error: null })
      try {
        const step = await client.step(state.sessionId, expected)
        applyStep(step, 'replay')
      } catch (error) {
        fail(error, 'awaiting_reading')
      }
    },

    replayPlay(paceMs = DEFAULT_PACE_MS) {
      const replay = get().replay
      if (!replay) return
      set({ replay: { ...replay, autoplay: true, paceMs } })
      const tick = async () => {
        const s = get()
        if (!s.replay?.autoplay) return
        if (s.phase === 'awaiting_reading' && !document.hidden) await get().replayNext()
        if (get().phase === 'resolved' || get().phase === 'unresolved' || get().phase === 'error') {
          get().replayPause()
          return
        }
        autoplayTimer = window.setTimeout(tick, paceMs)
      }
      autoplayTimer = window.setTimeout(tick, paceMs)
    },

    replayPause() {
      window.clearTimeout(autoplayTimer)
      const replay = get().replay
      if (replay) set({ replay: { ...replay, autoplay: false } })
    },

    async retry() {
      const { error } = get()
      if (!error) return
      set({ phase: error.resumePhase, error: null })
    },

    async reset() {
      const { sessionId, mode, domain, replay } = get()
      window.clearTimeout(autoplayTimer)
      if (!sessionId) return
      try {
        const view = await client.reset(sessionId)
        applyStart(view, { mode, domain, ...(replay ? { fixture: replay.fixtureId } : {}) }, client.kind)
      } catch (error) {
        fail(error, 'idle')
      }
    },

    setApiHealth(apiHealth) {
      set({ apiHealth })
    },
  }
})
