import { API_URL } from '@/lib/env'
import type { ApiHealth } from '@/state/types'
import { EngineError, type EngineClient, type StartRequest } from './client'
import { ErrorEnvelope, SessionView, StepView, type SessionViewT, type StepViewT } from './schemas'

const HEALTH_TIMEOUT_MS = 4000

async function request<T>(
  path: string,
  init: RequestInit,
  parse: (json: unknown) => T,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/v1${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
  } catch {
    throw new EngineError('api_unreachable', 'The engine did not answer.')
  }
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = ErrorEnvelope.safeParse(json)
    if (parsed.success) throw new EngineError(parsed.data.error.code, parsed.data.error.message)
    throw new EngineError('api_error', `The engine answered with status ${response.status}.`)
  }
  return parse(json)
}

export class ApiClient implements EngineClient {
  readonly kind = 'api' as const

  start(req: StartRequest): Promise<SessionViewT> {
    return request('/sessions', { method: 'POST', body: JSON.stringify(req) }, (j) =>
      SessionView.parse(j),
    )
  }

  step(sessionId: string, reading: number | null): Promise<StepViewT> {
    const body = reading === null ? {} : { reading }
    return request(
      `/sessions/${sessionId}/step`,
      { method: 'POST', body: JSON.stringify(body) },
      (j) => StepView.parse(j),
    )
  }

  reset(sessionId: string): Promise<SessionViewT> {
    return request(`/sessions/${sessionId}/reset`, { method: 'POST', body: '{}' }, (j) =>
      SessionView.parse(j),
    )
  }
}

/** ok | waking (timeout or 5xx: free hosting is spinning up) | down (network error). */
export async function probeHealth(): Promise<ApiHealth> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_URL}/v1/health`, { signal: controller.signal })
    return response.ok ? 'ok' : 'waking'
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'waking' : 'down'
  } finally {
    window.clearTimeout(timer)
  }
}
