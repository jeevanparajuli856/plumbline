import { z } from 'zod'
import type { DomainId, Mode } from '@/state/types'

const ModeParam = z.enum(['simulate', 'live', 'replay'])
const DomainParam = z.enum(['circuit', 'thermometer'])
const ViewParam = z.enum(['text', 'scene', 'both'])
export type SimView = z.infer<typeof ViewParam>
const FixtureParam = z.string().regex(/^[a-z0-9_]{1,64}$/)

export const DEMO_FIXTURES: Record<string, string> = { 'worked-example': 'worked_example' }
/** The recording replayed when the thermometer is chosen in replay mode. */
export const THERMOMETER_FIXTURE = 'thermometer_demo'

export interface SimParams {
  mode: Mode
  domain: DomainId
  fixture: string | undefined
  /** The ?view override for this visit only; null when absent (the Text only pref decides). */
  view: SimView | null
}

/** Reads /sim query parameters. Unknown values fall back to the defaults instead of throwing. */
export function parseSimParams(params: URLSearchParams): SimParams {
  const demoFixture = DEMO_FIXTURES[params.get('demo') ?? '']
  const fixtureParam = FixtureParam.safeParse(params.get('fixture'))
  const mode = demoFixture ? 'replay' : (ModeParam.safeParse(params.get('mode')).data ?? 'replay')
  const domain = DomainParam.safeParse(params.get('domain')).data ?? 'circuit'
  const explicit = fixtureParam.success ? fixtureParam.data : demoFixture
  const fixture =
    mode === 'replay'
      ? (explicit ?? (domain === 'thermometer' ? THERMOMETER_FIXTURE : undefined))
      : undefined
  return {
    mode,
    domain,
    fixture,
    view: ViewParam.safeParse(params.get('view')).data ?? null,
  }
}

/**
 * Text only for this visit: ?view=text forces it on and ?view=scene|both forces it off while the
 * parameter is present; without it the persisted switch decides. The URL never writes the pref.
 */
export function effectiveTextOnly(view: SimView | null, textOnlyPref: boolean): boolean {
  if (view === 'text') return true
  if (view === 'scene' || view === 'both') return false
  return textOnlyPref
}

/** New query string after a switch changes mode or instrument. Drops demo/fixture so the choice sticks. */
export function withChoice(
  params: URLSearchParams,
  change: { mode?: Mode; domain?: DomainId },
): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete('demo')
  next.delete('fixture')
  if (change.mode) next.set('mode', change.mode)
  if (change.domain) next.set('domain', change.domain)
  return next
}
