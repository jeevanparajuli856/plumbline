/**
 * A small GitHub-flavored-markdown table reader for the docs the landing renders at build time
 * (docs/EVIDENCE.md and the ladder in docs/brief/Plumbline_Scale_and_Build.md). It reads tables
 * and inline code, links and bold; anything else stays plain text. Never produces HTML strings.
 */

export interface MarkdownTable {
  /** Text of the nearest heading above the table. */
  heading: string
  headers: string[]
  rows: string[][]
}

export type InlineSegment =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'link'; text: string; href: string }

const DIVIDER = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/

/** Splits one table row into trimmed cells; `\|` stays a literal pipe. */
export function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]!
    if (ch === '\\' && body[i + 1] === '|') {
      current += '|'
      i += 1
    } else if (ch === '|') {
      cells.push(current.trim())
      current = ''
    } else current += ch
  }
  cells.push(current.trim())
  return cells
}

export function parseTables(markdown: string): MarkdownTable[] {
  const lines = markdown.split(/\r?\n/)
  const tables: MarkdownTable[] = []
  let heading = ''
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!
    const h = /^#{1,6}\s+(.*)$/.exec(line)
    if (h) {
      heading = h[1]!.trim()
      continue
    }
    const next = lines[i + 1]
    if (!line.trim().startsWith('|') || next === undefined || !DIVIDER.test(next.trim())) continue
    const headers = splitRow(line)
    const rows: string[][] = []
    let j = i + 2
    while (j < lines.length && lines[j]!.trim().startsWith('|')) {
      rows.push(splitRow(lines[j]!))
      j += 1
    }
    tables.push({ heading, headers, rows })
    i = j - 1
  }
  return tables
}

/** The first table under a heading whose text starts with `prefix`. */
export function tableUnder(markdown: string, prefix: string): MarkdownTable | null {
  return parseTables(markdown).find((t) => t.heading.startsWith(prefix)) ?? null
}

const INLINE =
  /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]*[^\s).,;:])/g

export function inlineSegments(text: string): InlineSegment[] {
  const out: InlineSegment[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    if (m[1] !== undefined) out.push({ kind: 'code', text: m[1] })
    else if (m[2] !== undefined) out.push({ kind: 'strong', text: m[2] })
    else if (m[3] !== undefined && m[4] !== undefined)
      out.push({ kind: 'link', text: m[3], href: m[4] })
    else if (m[5] !== undefined) out.push({ kind: 'link', text: m[5], href: m[5] })
    last = at + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

/** Removes editor notes such as "[verify ...]" (brackets not followed by a link target). */
export function stripEditorNotes(text: string): string {
  return text
    .replace(/\s*\[[^\]]*\](?!\()/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([;,.])/g, '$1')
    .trim()
}

export type StatusTone = 'done' | 'progress' | 'pending' | 'simulated'

/** Visual tone for an evidence status. Mixed statuses ("scratch DONE, engine PENDING") read as pending. */
export function statusTone(status: string): StatusTone {
  const s = status.toUpperCase()
  if (s.includes('PENDING')) return 'pending'
  if (s.includes('SIMULATED')) return 'simulated'
  if (s.includes('IN PROGRESS')) return 'progress'
  if (s.includes('DONE')) return 'done'
  return 'pending'
}

/**
 * Drops the brief's expectation numbers from an evidence cell. They are the teammate's original run,
 * not ours, and docs/POSITIONING.md keeps them off the site until the same command runs here.
 */
export function withoutBriefExpectations(text: string): string {
  return text.replace(/[;.,]?\s*[Bb]rief expect(?:ed|ation)\b[\s\S]*$/, '').trim()
}
