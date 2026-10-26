import { buttonClass, KEYCAP } from '@/ui/button'
import { useVoice } from '@/voice'

/**
 * Microphone toggle (key M), placed beside Submit reading. Stays enabled where the browser cannot
 * recognize speech: pressing it then says so and moves focus to the typed input, which the voice
 * runtime handles. The visible "Listening" tag is aria-hidden; aria-pressed carries the state.
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
        listening
          ? 'min-h-14 px-6 text-md border-measured bg-surface-2 aria-pressed:border-measured'
          : 'min-h-14 px-6 text-md',
      )}
    >
      <span>Say reading</span>
      {listening ? (
        <span aria-hidden="true" className="font-mono text-sm text-measured">
          Listening
        </span>
      ) : (
        <span aria-hidden="true" className={KEYCAP}>
          M
        </span>
      )}
    </button>
  )
}
