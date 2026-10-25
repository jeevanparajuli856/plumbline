import type { ApiHealth } from '@/state/types'
import { healthSentence } from './healthProbe'

interface ApiStatusProps {
  health: ApiHealth
  onRetry(): void
}

const MARK: Record<ApiHealth, string> = {
  ok: 'bg-text border-text',
  unknown: 'border-border-strong border-dashed',
  waking: 'border-measured',
  down: 'border-border-strong',
}

/** Engine status in words. Shape and text carry the state; nothing here pulses or blinks. */
export function ApiStatus({ health, onRetry }: ApiStatusProps) {
  return (
    <p
      data-testid="api-status"
      className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-text-2"
    >
      <span
        aria-hidden="true"
        className={`inline-block size-3 shrink-0 rounded-full border-2 ${MARK[health]}`}
      />
      <span>{healthSentence(health)}</span>
      {health === 'down' ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-hard px-2 font-medium text-text underline underline-offset-4 hover:bg-surface-2"
        >
          Check the engine again
        </button>
      ) : null}
    </p>
  )
}
