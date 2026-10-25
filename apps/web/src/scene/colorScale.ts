/** Probability to glow. Pure: no React, no three. Colours themselves come from scene/tokens.ts. */
export type Rgb = readonly [number, number, number]

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0
  return Math.min(1, Math.max(0, x))
}

/** Square root so a 25 % posterior is visibly half-lit instead of nearly dark. */
export function colorScale(p: number): number {
  return Math.sqrt(clamp01(p))
}

/** Emissive strength for a site: colorScale(p) x `--scene-glow-max`. */
export function glowIntensity(p: number, glowMax: number): number {
  return colorScale(p) * glowMax
}

export function mixRgb(a: Rgb, b: Rgb, t: number): [number, number, number] {
  const u = clamp01(t)
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}
