/**
 * A deliberately small markdown reader for docs/EVIDENCE.md: h2 sections, pipe tables,
 * numbered lists, paragraphs, code spans, URLs and arXiv ids. Output is data; nothing is
 * rendered as HTML, so there is no injection path.
 */

export type StatusKind = 'DONE' | 'IN PROGRESS' | 'PENDING' | 'SIMULATED'

export interface StatusPart {
  qualifier: string
  status: StatusKind
}

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; text: string }

export interface Table {
  header: string[]
  rows: string[][]
}

/** Body of `## <number>. ...` up to the next h2. Empty when the section is missing. */
export function section(md: string, number: string): string {
  const lines = md.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`## ${number}.`))
  if (start === -1) return ''
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

export function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return inner.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

const SEPARATOR_CELL = /^:?-{3,}:?$/

export function parseTable(block: string): Table {
  const lines = block.split('\n').filter((l) => l.trim().startsWith('|'))
  if (lines.length < 2) return { header: [], rows: [] }
  const [head, ...body] = lines.map(splitRow)
  const rows = body.filter((cells) => !cells.every((c) => SEPARATOR_CELL.test(c)))
  return { header: head ?? [], rows }
}

const STATUS_PATTERN = /(IN PROGRESS|DONE|PENDING|SIMULATED)/

export function parseStatus(cell: string): StatusPart[] {
  return cell
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(STATUS_PATTERN)
      if (!match) return { qualifier: part, status: 'PENDING' as const }
      return { qualifier: part.replace(match[0], '').trim(), status: match[0] as StatusKind }
    })
}

const RANK: Record<StatusKind, number> = { PENDING: 0, 'IN PROGRESS': 1, SIMULATED: 2, DONE: 3 }

/** The least finished part decides how the row reads. */
export function overallStatus(parts: readonly StatusPart[]): StatusKind {
  return parts.reduce<StatusKind>(
    (worst, p) => (RANK[p.status] < RANK[worst] ? p.status : worst),
    'DONE',
  )
}

const LINKABLE = /(https?:\/\/[^\s)]+)|arXiv (\d{4}\.\d{4,5})/g

function linkify(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const match of text.matchAll(LINKABLE)) {
    const at = match.index ?? 0
    let whole = match[0]
    let href = match[1] ? whole : `https://arxiv.org/abs/${match[2]}`
    if (match[1]) {
      const trimmed = whole.replace(/[.,;:]+$/, '')
      whole = trimmed
      href = trimmed
    }
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })
    out.push({ kind: 'link', href, text: whole })
    last = at + whole.length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}

export function parseInline(cell: string): Inline[] {
  const parts = cell.split('`')
  return parts.flatMap((part, i): Inline[] => {
    if (part === '') return []
    if (i % 2 === 1) return [{ kind: 'code', text: part }]
    return linkify(part.replace(/\*\*/g, ''))
  })
}

const NUMBERED = /^\d+\.\s+/

export function parseNumberedList(block: string): string[] {
  const items: string[] = []
  for (const line of block.split('\n')) {
    if (NUMBERED.test(line)) items.push(line.replace(NUMBERED, '').trim())
    else if (/^\s+\S/.test(line) && items.length > 0) items[items.length - 1] += ` ${line.trim()}`
  }
  return items
}

export function parseParagraphs(block: string): string[] {
  const paragraphs: string[] = []
  let current: string[] = []
  let inList = false
  const flush = () => {
    if (current.length > 0) paragraphs.push(current.join(' '))
    current = []
  }
  for (const line of block.split('\n')) {
    if (line.trim() === '') {
      flush()
      inList = false
    } else if (NUMBERED.test(line) || line.trim().startsWith('|') || line.trim().startsWith('- ')) {
      flush()
      inList = true
    } else if (!(inList && /^\s/.test(line))) {
      current.push(line.trim())
    }
  }
  flush()
  return paragraphs
}

export interface EvidenceRow {
  item: Inline[]
  statusText: string
  statuses: StatusPart[]
  evidence: Inline[]
}

export interface Statistic {
  statistic: Inline[]
  source: Inline[]
}

export interface Evidence {
  intro: string[]
  readiness: EvidenceRow[]
  studies: string[]
  studyNotes: string[]
  statistics: Statistic[]
}

export function parseEvidence(md: string): Evidence {
  const readiness = parseTable(section(md, '1')).rows.map(
    ([item = '', status = '', evidence = '']) => ({
      item: parseInline(item),
      statusText: status,
      statuses: parseStatus(status),
      evidence: parseInline(evidence),
    }),
  )
  const studiesBlock = section(md, '2')
  const statistics = parseTable(section(md, '3')).rows.map(([statistic = '', source = '']) => ({
    statistic: parseInline(statistic),
    source: parseInline(source),
  }))
  const intro = parseParagraphs(md.split('\n## ')[0]?.split('\n').slice(1).join('\n') ?? '')
  return {
    intro,
    readiness,
    studies: parseNumberedList(studiesBlock),
    studyNotes: parseParagraphs(studiesBlock),
    statistics,
  }
}
