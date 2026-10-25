export interface ConfusionBand {
  p_same: number
  p_pm1: number
  p_pm2: number
}

const BAND_REACH = 2

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * The assumed hand model as three numbers, read from a recording's `config.confusion`.
 * Engine recordings store the full told-by-landed matrix; the first row with two neighbours
 * on each side carries the unclipped band. Older recordings stored the three numbers directly.
 */
export function confusionBand(confusion: unknown): ConfusionBand | null {
  if (Array.isArray(confusion)) {
    const rows = confusion as unknown[]
    const i = BAND_REACH
    const row = rows[i]
    if (rows.length <= 2 * BAND_REACH || !Array.isArray(row)) return null
    const [pSame, pPm1, pPm2] = [row[i], row[i - 1], row[i - 2]]
    return isNumber(pSame) && isNumber(pPm1) && isNumber(pPm2)
      ? { p_same: pSame, p_pm1: pPm1, p_pm2: pPm2 }
      : null
  }
  if (confusion && typeof confusion === 'object') {
    const c = confusion as Partial<Record<keyof ConfusionBand, unknown>>
    return isNumber(c.p_same) && isNumber(c.p_pm1) && isNumber(c.p_pm2)
      ? { p_same: c.p_same, p_pm1: c.p_pm1, p_pm2: c.p_pm2 }
      : null
  }
  return null
}
