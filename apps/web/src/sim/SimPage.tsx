import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { currentPhrase, repeatInstruction } from '@/a11y/repeatInstruction'
import { registeredShortcut } from '@/a11y/shortcutRegistry'
import { useKeyboardMap } from '@/a11y/useKeyboardMap'
import { DOMAINS } from '@/state/domains'
import { useLanding } from '@/state/landing'
import { usePrefs } from '@/state/prefs'
import { ReplayClient } from '@/state/replay'
import { currentClient, useSession } from '@/state/session'
import type { DomainId, Mode, Phase } from '@/state/types'
import { KeyboardMapDialog } from '@/ui/KeyboardMapDialog'
import { BeliefChart } from './BeliefChart'
import { headingFor } from './flow'
import { InstructionPanel } from './InstructionPanel'
import { DiagnosisCard, ErrorNotice, RefusalPanel } from './Outcome'
import { PlacementStrip } from './PlacementStrip'
import { ReadingForm } from './ReadingForm'
import { ReadingLog } from './ReadingLog'
import { ReplayControls } from './ReplayControls'
import { isRewinding, stepBack, useRewinding } from './replayNav'
import { SimToolbar } from './SimToolbar'
import { effectiveTextOnly, parseSimParams, withChoice } from './simParams'
import { useApiHealthProbe } from './useApiHealthProbe'
import { requestViewReset } from '@/scene/viewControl'
import { useSimFocus, type FocusRefs } from './useSimFocus'
import { WarningBanner } from './WarningBanner'
import { logRows, placementItems } from './view'
import { ListenButton } from './ListenButton'

/** Phases from which [ may rewind; never mid-step. */
const REWINDABLE: readonly Phase[] = ['awaiting_reading', 'resolved', 'unresolved']

/** The simulator as an instrument (POSITIONING 5). Container: owns params, session start, keys and focus. */
export function SimPage() {
  const [params, setParams] = useSearchParams()
  const { mode, domain, fixture, view } = parseSimParams(params)
  const setSceneMode = useLanding((s) => s.setSceneMode)
  const textOnly = usePrefs((s) => s.textOnly)
  const voiceEnabled = usePrefs((s) => s.voiceEnabled)
  const setVoiceEnabled = usePrefs((s) => s.setVoiceEnabled)
  const s = useSession(
    useShallow((st) => ({
      domain: st.domain,
      mode: st.mode,
      phase: st.phase,
      catalog: st.catalog,
      instruction: st.instruction,
      aimedSite: st.aimedSite,
      readings: st.readings,
      belief: st.belief,
      entropyBits: st.entropyBits,
      maxEntropyBits: st.maxEntropyBits,
      placement: st.placement,
      warning: st.warning,
      diagnosis: st.diagnosis,
      unresolved: st.unresolved,
      baseline: st.baseline,
      replay: st.replay,
      error: st.error,
      apiHealth: st.apiHealth,
    })),
  )
  const setApiHealth = useSession((st) => st.setApiHealth)
  const [helpOpen, setHelpOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const warningRef = useRef<HTMLDivElement>(null)
  const diagnosisRef = useRef<HTMLDivElement>(null)
  const refusalRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const focusRefs = useMemo<FocusRefs>(
    () => ({
      input: inputRef,
      warning: warningRef,
      diagnosis: diagnosisRef,
      refusal: refusalRef,
      error: errorRef,
    }),
    [],
  )

  useEffect(() => {
    setSceneMode('sim')
    return () => setSceneMode('hidden')
  }, [setSceneMode])

  useEffect(() => {
    void useSession.getState().start({ mode, domain, ...(fixture ? { fixture } : {}) })
    return () => useSession.getState().replayPause()
  }, [mode, domain, fixture])

  const checkAgain = useApiHealthProbe(setApiHealth)

  const lastReading = s.readings[s.readings.length - 1]
  useSimFocus(
    {
      phase: s.phase,
      hasWarning: s.warning !== null,
      mode: s.mode,
      lastSource: lastReading?.source ?? null,
    },
    focusRefs,
  )

  const choose = useCallback(
    (change: { mode?: Mode; domain?: DomainId }) =>
      setParams(withChoice(params, change), { replace: true }),
    [params, setParams],
  )

  const rewinding = useRewinding()
  const next = () => {
    if (!isRewinding()) void useSession.getState().replayNext()
  }
  const playPause = () => {
    if (isRewinding()) return
    const st = useSession.getState()
    if (st.replay?.autoplay) st.replayPause()
    else st.replayPlay()
  }

  useKeyboardMap(
    {
      aim: ({ site }) => useSession.getState().aimProbe(site),
      submit: () => formRef.current?.requestSubmit(),
      focusInput: () => inputRef.current?.focus(),
      speech: () => setVoiceEnabled(!usePrefs.getState().voiceEnabled),
      repeat: () => repeatInstruction(useSession.getState()),
      log: () => setLogOpen((open) => !open),
      playPause,
      // Never rewind mid-step (submitting or revealing); the Previous button has the same rule.
      previous: () => {
        if (REWINDABLE.includes(useSession.getState().phase)) void stepBack(useSession)
      },
      next,
      help: () => setHelpOpen(true),
      // Only consumed when something (the voice lane's listener) is there to cancel.
      escape: () => {
        const cancel = registeredShortcut('escape')
        if (!cancel) return false
        cancel({ type: 'escape' })
        return true
      },
    },
    !helpOpen,
  )

  const spec = DOMAINS[s.domain]
  const catalog = s.catalog
  const heading = headingFor(s)
  const settled = s.phase === 'resolved'
  const client = currentClient()
  const expected = s.replay && client instanceof ReplayClient ? client.expectedReading() : null
  const showScene = !effectiveTextOnly(view, textOnly)
  const unresolvedPair = catalog
    ? catalog.hypotheses.filter((h) => (s.unresolved?.classes[0] ?? []).includes(h.id))
    : []

  return (
    <>
      <SimToolbar
        domain={domain}
        mode={mode}
        simulated={domain === 'thermometer' || Boolean(catalog?.simulated)}
        speech={voiceEnabled}
        health={s.apiHealth}
        onDomain={(d) => choose({ domain: d })}
        onMode={(m) => choose({ mode: m })}
        onSpeech={setVoiceEnabled}
        onShortcuts={() => setHelpOpen(true)}
        onRetryHealth={checkAgain}
        listen={<ListenButton />}
      />
      <main id="main" className="bg-bench">
        <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-x-12 gap-y-10 px-4 pb-16 pt-8 sm:px-8 lg:grid-cols-12 lg:px-16 lg:pt-12">
          <div className="grid min-w-0 grid-cols-1 content-start gap-8 lg:col-span-7">
            {s.warning && catalog ? (
              <WarningBanner
                ref={warningRef}
                warning={s.warning}
                likelyLabel={catalog.sites[s.warning.likelySite]?.label ?? ''}
              />
            ) : null}
            <InstructionPanel
              heading={heading}
              entropyBits={s.entropyBits}
              maxEntropyBits={s.maxEntropyBits}
              settled={settled}
              {...(currentPhrase(s)
                ? { onRepeat: () => repeatInstruction(useSession.getState()) }
                : {})}
            />
            {s.error ? (
              <ErrorNotice
                ref={errorRef}
                error={s.error}
                onRetry={() => void useSession.getState().retry()}
              />
            ) : null}
            {s.phase === 'resolved' && s.diagnosis ? (
              <DiagnosisCard
                ref={diagnosisRef}
                diagnosis={s.diagnosis}
                readingCount={s.readings.length}
                baseline={s.baseline}
              />
            ) : null}
            {s.phase === 'unresolved' && s.unresolved ? (
              <RefusalPanel
                ref={refusalRef}
                text={s.unresolved.text || spec.phrases.unresolved(unresolvedPair)}
                pair={unresolvedPair}
              />
            ) : null}
            {/* Sprint 2 (ADR-0012): the "Ask" explainer panel goes here, after the outcome and before the
                reading panel; render nothing when the provider is off. The column's gap-8 stack absorbs it. */}
            <div className="rounded-hard border-2 border-border-strong bg-surface-1 p-5 shadow-[var(--shadow-panel)] sm:p-6">
              <ReadingForm
                key={`${s.domain}-${s.mode}`}
                spec={spec}
                mode={s.mode}
                canSubmit={s.phase === 'awaiting_reading'}
                expectedReading={expected}
                inputRef={inputRef}
                formRef={formRef}
                onSubmit={(value) =>
                  void useSession
                    .getState()
                    .submitReading(value, s.mode === 'simulate' ? 'simulated' : 'typed')
                }
              />
              <div className="mt-6 border-t border-hairline pt-5">
                <ReplayControls
                  replay={s.replay}
                  canStep={s.phase === 'awaiting_reading' && !rewinding}
                  canPrevious={!rewinding && REWINDABLE.includes(s.phase)}
                  onPrevious={() => void stepBack(useSession)}
                  onNext={next}
                  onPlayPause={playPause}
                  onReset={() => void useSession.getState().reset()}
                />
              </div>
            </div>
            {catalog ? (
              <PlacementStrip
                siteNoun={spec.siteNoun}
                onAim={(site) => useSession.getState().aimProbe(site)}
                items={placementItems({
                  placement: s.placement,
                  catalog,
                  toldSite: lastReading?.toldSite ?? s.instruction?.site ?? null,
                  landedSite: lastReading?.landedSite ?? null,
                  aimedSite: s.aimedSite,
                })}
              />
            ) : null}
          </div>

          <div className="grid min-w-0 grid-cols-1 content-start gap-8 lg:col-span-5">
            {showScene ? <BenchFrame /> : null}
            {catalog ? (
              <BeliefChart
                belief={s.belief}
                catalog={catalog}
                baseline={s.baseline}
                hasReadings={s.readings.length > 0}
                unresolvedLabels={
                  s.phase === 'unresolved' ? unresolvedPair.map((h) => h.label) : null
                }
              />
            ) : null}
          </div>

          <div className="min-w-0 lg:col-span-12">
            {catalog ? (
              <ReadingLog
                rows={logRows(s.readings, catalog, spec)}
                open={logOpen}
                onToggle={() => setLogOpen((o) => !o)}
              />
            ) : null}
          </div>
        </div>
      </main>
      <KeyboardMapDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

/**
 * The frame the scene lane portals its Canvas into (#scene-slot). The slot has its own wide aspect
 * and a minimum height so the Canvas never measures 0; it is rendered once and never remounted on
 * phase changes. Reads as a finished bench when empty.
 */
function BenchFrame() {
  return (
    <figure className="m-0">
      <div className="ruled relative overflow-hidden rounded-hard border-2 border-border-strong">
        <span
          aria-hidden="true"
          className="label-caps pointer-events-none absolute left-3 top-2 z-10 bg-surface-1 px-1"
        >
          Bench
        </span>
        <div id="scene-slot" className="relative aspect-[16/10] min-h-60 w-full lg:min-h-90" />
      </div>
      <figcaption className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <span className="font-mono text-text-2">
          Bench view, for sighted viewers. Everything in it is also in the text.
        </span>
        <button
          type="button"
          onClick={requestViewReset}
          className="inline-flex min-h-11 items-center rounded-hard px-2 font-medium text-text underline decoration-hairline underline-offset-4 hover:decoration-text"
        >
          Reset view
        </button>
      </figcaption>
    </figure>
  )
}
