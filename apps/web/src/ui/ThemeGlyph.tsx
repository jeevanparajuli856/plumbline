import type { ResolvedTheme } from './useSystemTheme'

/** Sun for the light theme, moon for dark and high contrast. Decorative: the button name says the theme. */
export function ThemeGlyph({ theme }: { theme: ResolvedTheme }) {
  if (theme === 'light') {
    return (
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3.75" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 1.5v2.25M10 16.25v2.25M1.5 10h2.25M16.25 10h2.25M4 4l1.6 1.6M14.4 14.4 16 16M4 16l1.6-1.6M14.4 5.6 16 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
