/**
 * Button looks. Amber primary (the one action per view), ink for the way into the demo,
 * a 1.5px line for everything secondary, quiet for tertiary. Hover shifts the background; primary
 * and ink also press in a touch (0.98). No elevation.
 */
export type ButtonVariant = 'primary' | 'ink' | 'line' | 'secondary' | 'quiet'

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-button border-[1.5px] px-4 py-2 font-medium transition-[background-color,border-color,color,scale] duration-[var(--motion-fast)] ease-[var(--ease-smooth)] disabled:cursor-not-allowed disabled:border-dashed disabled:active:scale-100'

const LINE =
  'border-border-strong bg-transparent text-text hover:bg-surface-2 disabled:text-muted disabled:hover:bg-transparent'

// No ink-hover token yet: mix a little on-ink into ink so the shift reads in every theme.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'active:scale-[0.98] border-action bg-action text-on-action hover:border-action-hover hover:bg-action-hover disabled:border-border-strong disabled:bg-surface-2 disabled:text-muted',
  ink: 'active:scale-[0.98] border-border-strong bg-ink text-on-ink hover:bg-[color-mix(in_srgb,var(--ink)_84%,var(--on-ink))] disabled:bg-surface-2 disabled:text-muted',
  line: LINE,
  secondary: LINE,
  quiet:
    'border-transparent text-text underline decoration-hairline underline-offset-4 hover:bg-surface-2 hover:decoration-text disabled:border-border-strong disabled:text-muted',
}

export function buttonClass(variant: ButtonVariant = 'secondary', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim()
}

/** A visible key cap next to a button label; hidden from the accessible name (aria-keyshortcuts carries it). */
export const KEYCAP =
  'rounded-hard border border-border-strong bg-surface-2 px-1.5 font-mono text-sm leading-tight text-text-2'
