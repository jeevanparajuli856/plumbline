import evidenceMd from '@docs/EVIDENCE.md?raw'
import ladderMd from '@docs/brief/Plumbline_Scale_and_Build.md?raw'
import {
  inlineSegments,
  parseTables,
  splitRow,
  statusTone,
  stripEditorNotes,
  tableUnder,
  withoutBriefExpectations,
} from './markdownTables'

describe('splitRow', () => {
  it('trims cells and keeps escaped pipes', () => {
    expect(splitRow('| a | b \\| c |  d |')).toEqual(['a', 'b | c', 'd'])
  })
})

describe('parseTables', () => {
  const md = [
    '# Top',
    '',
    '## Section one',
    '| H1 | H2 |',
    '|---|:---:|',
    '| a | b |',
    '| c | d |',
    '',
    'text',
    '| not | a table |',
  ].join('\n')

  it('reads headers, rows and the heading above', () => {
    expect(parseTables(md)).toEqual([
      {
        heading: 'Section one',
        headers: ['H1', 'H2'],
        rows: [
          ['a', 'b'],
          ['c', 'd'],
        ],
      },
    ])
  })

  it('reads the readiness table from docs/EVIDENCE.md', () => {
    const t = tableUnder(evidenceMd, '1. Readiness')
    expect(t?.headers).toEqual(['Item', 'Status', 'Evidence'])
    expect(t!.rows.length).toBeGreaterThan(10)
    for (const row of t!.rows) expect(row).toHaveLength(3)
  })

  it('reads the four ladder rungs from the scale brief', () => {
    const t = tableUnder(ladderMd, 'Scale ladder')
    expect(t?.headers).toEqual(['Stage', 'User', 'What the engine infers', 'Who pays'])
    expect(t!.rows).toHaveLength(4)
  })

  it('returns null when no table sits under the heading', () => {
    expect(tableUnder(md, 'Nope')).toBeNull()
  })
})

describe('inlineSegments', () => {
  it('splits code, bold, markdown links and bare URLs', () => {
    expect(
      inlineSegments('run `pytest -q` and **see** [docs](https://x.org/a) or https://y.org/b.'),
    ).toEqual([
      { kind: 'text', text: 'run ' },
      { kind: 'code', text: 'pytest -q' },
      { kind: 'text', text: ' and ' },
      { kind: 'strong', text: 'see' },
      { kind: 'text', text: ' ' },
      { kind: 'link', text: 'docs', href: 'https://x.org/a' },
      { kind: 'text', text: ' or ' },
      { kind: 'link', text: 'https://y.org/b', href: 'https://y.org/b' },
      { kind: 'text', text: '.' },
    ])
  })

  it('returns plain text untouched', () => {
    expect(inlineSegments('plain')).toEqual([{ kind: 'text', text: 'plain' }])
  })
})

describe('stripEditorNotes', () => {
  it('drops bracketed notes, including ones with dashes, and keeps links', () => {
    expect(stripEditorNotes('APH as distributor [verify APH funding]')).toBe('APH as distributor')
    expect(stripEditorNotes('payers [proven category — verify]')).toBe('payers')
    expect(stripEditorNotes('[a](https://x.org) b')).toBe('[a](https://x.org) b')
  })

  it('leaves no brackets or em-dashes in the ladder cells', () => {
    const t = tableUnder(ladderMd, 'Scale ladder')!
    for (const cell of t.rows.flat().map(stripEditorNotes)) {
      expect(cell).not.toMatch(/[[\]—]/)
    }
  })
})

describe('statusTone', () => {
  it('maps each status to one tone; mixed reads as pending', () => {
    expect(statusTone('DONE')).toBe('done')
    expect(statusTone('IN PROGRESS')).toBe('progress')
    expect(statusTone('PENDING')).toBe('pending')
    expect(statusTone('scratch DONE, engine PENDING')).toBe('pending')
    expect(statusTone('SIMULATED')).toBe('simulated')
    expect(statusTone('unknown')).toBe('pending')
  })
})

describe('withoutBriefExpectations', () => {
  it('cuts the brief expectation clause and keeps our own evidence', () => {
    expect(withoutBriefExpectations('`cmd`; file.md. Brief expectation: 99.0% correct')).toBe(
      '`cmd`; file.md',
    )
    expect(withoutBriefExpectations('Scratch: 32 classes; brief expected 31')).toBe(
      'Scratch: 32 classes',
    )
    expect(withoutBriefExpectations('no expectations here')).toBe('no expectations here')
  })

  it('keeps every brief headline number out of the rendered readiness table', () => {
    const t = tableUnder(evidenceMd, '1. Readiness')!
    const rendered = t.rows.map((r) => withoutBriefExpectations(r[2] ?? '')).join(' ')
    for (const n of ['99.0', '21.2', '78.7', '176 of 178', '63.5', '97.6', 'under 2%']) {
      expect(rendered).not.toContain(n)
    }
  })
})
