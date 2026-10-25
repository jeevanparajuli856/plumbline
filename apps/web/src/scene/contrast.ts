/** WCAG contrast for the scene's stroke tokens. Pure; used by tests to guard tokens.css. */
function channel(hex: string, offset: number): number {
  const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  return 0.2126 * channel(h, 0) + 0.7152 * channel(h, 2) + 0.0722 * channel(h, 4)
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

export type ThemeName = 'light' | 'dark' | 'hc'

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim()
  return out
}

/** Custom properties per theme from tokens.css; dark and hc inherit light's unset values. */
export function themeBlocks(css: string): Record<ThemeName, Record<string, string>> {
  const block = (selector: RegExp) => {
    const m = css.match(selector)
    return m ? declarations(m[1]!) : {}
  }
  const light = block(/:root\s*\{([^}]*)\}/)
  const dark = { ...light, ...block(/:root\[data-theme='dark'\][^{]*\{([^}]*)\}/) }
  const hc = { ...light, ...block(/:root\[data-theme='hc'\][^{]*\{([^}]*)\}/) }
  return { light, dark, hc }
}
