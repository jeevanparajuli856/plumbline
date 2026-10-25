import { useEffect, useId, useRef } from 'react'
import { SHORTCUTS } from '@/a11y/keymap'
import { useShortcutPref } from '@/a11y/shortcutPref'
import { buttonClass } from './button'
import { Switch } from './Switch'

interface KeyboardMapDialogProps {
  open: boolean
  onClose(): void
}

/** Native modal dialog listing the keyboard map. Esc closes it (native cancel), focus returns to the opener. */
export function KeyboardMapDialog({ open, onClose }: KeyboardMapDialogProps) {
  const singleKeys = useShortcutPref((s) => s.singleKeys)
  const setSingleKeys = useShortcutPref((s) => s.setSingleKeys)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      const opener = document.activeElement as HTMLElement | null
      dialog.showModal()
      return () => {
        // Close first: focus cannot leave a modal dialog that is still open.
        if (dialog.open) dialog.close()
        opener?.focus?.()
      }
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-soft border-2 border-border-strong bg-surface-1 p-0 text-text shadow-[var(--shadow-panel)] backdrop:bg-bench/80"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold">
          Keyboard shortcuts
        </h2>
        <button type="button" onClick={onClose} className={buttonClass('secondary')}>
          Close
        </button>
      </div>
      <div className="grid gap-2 px-6 pt-4">
        <Switch
          label="Single-key shortcuts"
          checked={singleKeys}
          onChange={setSingleKeys}
          description="Turn off if speech input or a stray key press triggers them. Enter and Esc keep working."
        />
        <p className="text-text-2">
          Single keys work anywhere in the web app except while you are typing in a field. Most also
          have a control on the page: the row cells aim, and the buttons carry their key.
        </p>
      </div>
      <table className="mx-6 my-4 w-[calc(100%-3rem)] border-collapse text-left">
        <caption className="sr-only">Keyboard shortcuts</caption>
        <thead>
          <tr className="text-text-2">
            <th scope="col" className="border-b-2 border-border-strong py-2 pr-4 font-medium">
              Key
            </th>
            <th scope="col" className="border-b-2 border-border-strong py-2 font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map((s) => (
            <tr key={s.action}>
              <td className="whitespace-nowrap border-b border-hairline py-2 pr-4">
                <kbd className="rounded-hard border border-border-strong bg-surface-2 px-2 py-0.5 font-mono">
                  {s.keys}
                </kbd>
              </td>
              <td className="border-b border-hairline py-2">{s.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </dialog>
  )
}
