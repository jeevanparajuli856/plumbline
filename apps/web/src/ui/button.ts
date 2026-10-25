/** Button looks. Ink-filled primary (paper and ink), ruled secondary, quiet tertiary. */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet'

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-hard px-4 py-2 font-medium transition-[background-color,border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-smooth)] active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-2 border-text bg-text text-bench hover:bg-text-2 hover:border-text-2 disabled:border-border-strong disabled:border-dashed disabled:bg-surface-2 disabled:text-muted',
  secondary:
    'border-2 border-border-strong bg-surface-1 text-text hover:bg-surface-2 hover:border-text disabled:border-dashed disabled:text-muted disabled:hover:bg-surface-1 disabled:hover:border-border-strong',
  quiet:
    'border-2 border-transparent text-text underline decoration-hairline underline-offset-4 hover:decoration-text disabled:text-muted',
}

export function buttonClass(variant: ButtonVariant = 'secondary', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim()
}

/** A visible key cap next to a button label; hidden from the accessible name (aria-keyshortcuts carries it). */
export const KEYCAP =
  'rounded-hard border border-border-strong bg-surface-2 px-1.5 font-mono text-sm leading-tight text-text-2'
