import { useState, type ReactNode } from 'react'
import { PREVIEW_CODE, PREVIEW_GATE_ENABLED } from '@/lib/env'

const STORAGE_KEY = 'plumbline.preview'

function unlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === PREVIEW_CODE
  } catch {
    return false
  }
}

/** Optional private-preview gate for the product area. Off unless VITE_PREVIEW_GATE=1. No accounts. */
export function PreviewGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => !PREVIEW_GATE_ENABLED || unlocked())
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  if (open) return <>{children}</>
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-xl font-semibold">Private research preview</h1>
      <p className="mt-2 text-text-2">Enter the access code you were given.</p>
      <form
        className="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (code.trim() === PREVIEW_CODE && PREVIEW_CODE) {
            try {
              localStorage.setItem(STORAGE_KEY, code.trim())
            } catch {
              /* storage unavailable */
            }
            setOpen(true)
          } else setWrong(true)
        }}
      >
        <label htmlFor="preview-code" className="font-medium">
          Access code
        </label>
        <input
          id="preview-code"
          className="rounded-hard border-2 border-border-strong bg-surface-1 px-3 py-2 font-mono text-lg"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-describedby={wrong ? 'preview-error' : undefined}
          autoComplete="off"
        />
        {wrong && (
          <p id="preview-error" role="alert" className="text-warning-text">
            That code did not match.
          </p>
        )}
        <button
          type="submit"
          className="rounded-hard bg-inferred px-4 py-3 font-semibold text-white"
        >
          Open the preview
        </button>
      </form>
    </main>
  )
}
