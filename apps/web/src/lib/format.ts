import type { DomainSpec } from '@/state/types'

export function formatReading(
  value: number,
  domain: Pick<DomainSpec, 'unit' | 'readingDecimals'>,
): string {
  return `${value.toFixed(domain.readingDecimals)} ${domain.unit}`
}

export function formatPct(p: number, decimals = 1): string {
  return `${(p * 100).toFixed(decimals)}%`
}

export function formatBits(bits: number): string {
  return `${bits.toFixed(2)} bits`
}
