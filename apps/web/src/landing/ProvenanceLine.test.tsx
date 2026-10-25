import { render, screen } from '@testing-library/react'
import type { FixtureT } from '@/engine/schemas'
import { loadFixture } from '@/state/replay'
import { ProvenanceLine } from './ProvenanceLine'
import { SHORT_SHA_LENGTH, provenance } from './workedExample'

let provisional: FixtureT
let recorded: FixtureT

beforeAll(async () => {
  provisional = await loadFixture('worked_example')
  recorded = {
    ...provisional,
    provisional: false,
    generated_by: 'python -m plumbline.record_fixtures --fixture worked_example',
    git_sha: '0123456789abcdef0123',
    generated_at: '2026-10-26T12:00:00Z',
  }
})

describe('provenance', () => {
  it('is null while the fixture is provisional', () => {
    expect(provenance(provisional)).toBeNull()
    expect(provenance({ ...recorded, provisional: true })).toBeNull()
    expect(provenance({ ...recorded, generated_by: null })).toBeNull()
  })

  it('reads command, short SHA and date from the fixture', () => {
    expect(provenance(recorded)).toEqual({
      command: recorded.generated_by,
      sha: '0123456789abcdef0123'.slice(0, SHORT_SHA_LENGTH),
      date: '2026-10-26',
    })
    expect(provenance({ ...recorded, git_sha: null, generated_at: null })).toEqual({
      command: recorded.generated_by,
      sha: null,
      date: null,
    })
  })
})

describe('ProvenanceLine', () => {
  it('renders nothing for a provisional fixture', () => {
    const { container } = render(<ProvenanceLine fixture={provisional} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a static mono caption with the command, 7-character SHA, date and honesty note', () => {
    render(<ProvenanceLine fixture={recorded} />)
    const caption = screen.getByTestId('caption')
    expect(caption).toHaveTextContent(
      'Recorded by python -m plumbline.record_fixtures --fixture worked_example, commit 0123456, 2026-10-26. Preliminary. Not peer reviewed.',
    )
    expect(caption.querySelectorAll('code')).toHaveLength(2)
    expect(caption).not.toHaveAttribute('aria-live')
    expect(caption.closest('[aria-live]')).toBeNull()
  })
})
