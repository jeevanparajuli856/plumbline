import { buttonClass, KEYCAP } from '@/ui/button'
import { useVoice } from '@/voice'

/**
 * Microphone toggle (key M). Stays enabled where the browser cannot recognize speech: pressing it
 * then says so and moves focus to the typed input, which the voice runtime handles.
 */
export function ListenButton() {
  const { listening, toggleListen } = useVoice()
  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-keyshortcuts="M"
      onClick={toggleListen}
      className={buttonClass(
        'secondary',
        listening ? 'border-measured bg-surface-2 aria-pressed:border-measured' : '',
      )}
    >
      <span>Listen</span>
      <span aria-hidden="true" className={KEYCAP}>
        M
      </span>
    </button>
  )
}
