import type { ApiHealth, EngineSource, Mode } from '@/state/types'
import type { SessionViewT, StepViewT } from './schemas'

export interface StartRequest {
  domain: 'circuit' | 'thermometer'
  mode: Mode
  seed?: number
  true_hypothesis?: string
  fixture?: string
}

/** Every engine (HTTP API, fixture replay, future local TS port) speaks this interface. */
export interface EngineClient {
  readonly kind: EngineSource
  start(req: StartRequest): Promise<SessionViewT>
  step(sessionId: string, reading: number | null): Promise<StepViewT>
  reset(sessionId: string): Promise<SessionViewT>
}

export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'EngineError'
  }
}

export interface ClientChoice {
  kind: EngineSource
  reason: 'replay_mode' | 'api_ok' | 'api_unavailable' | 'local_parity'
}

/** Replay never touches the network. Simulate/live use the API, or the local port once parity passes. */
export function chooseClient(mode: Mode, apiHealth: ApiHealth, localParity: boolean): ClientChoice {
  if (mode === 'replay') return { kind: 'replay', reason: 'replay_mode' }
  if (localParity) return { kind: 'local', reason: 'local_parity' }
  if (apiHealth === 'ok' || apiHealth === 'unknown') return { kind: 'api', reason: 'api_ok' }
  return { kind: 'replay', reason: 'api_unavailable' }
}
