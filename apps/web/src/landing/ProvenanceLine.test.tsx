import { render, screen } from '@testing-library/react'
import type { FixtureT } from '@/engine/schemas'
import { loadFixture } from '@/state/replay'
import { ProvenanceLine } from './ProvenanceLine'
import { SHORT_SHA_LENGTH, provenance } from './workedExample'

/** The shared schema does not declare `seed` yet; recordings carry it. */
function withSeed(fx: FixtureT, seed: number | null): FixtureT {
  return { ...fx, seed } as FixtureT
}

let recorded: FixtureT
let provisional: FixtureT

beforeAll(async () => {
  const fx = await loadFixture('worked_example')
  recorded = {
    ...fx,
    generated_by: 'python -m plumbline.record_fixtures --fixture worked_example',
    git_sha: '0123456789abcdef0123',
    generated_at: '2026-10-26T12:00:00Z',
  }
  provisional = { ...recorded, provisional: true }
})

describe('provenance', () => {
  it('is null while the fixture is provisional', () => {
    expect(provenance(provisional)).toBeNull()
    expect(provenance({ ...recorded, generated_by: null })).toBeNull()
  })

  it('reads command, short SHA and date from the fixture', () => {
    expect(provenance(withSeed(recorded, 7))).toEqual({
      command: recorded.generated_by,
      sha: '0123456789abcdef0123'.slice(0, SHORT_SHA_LENGTH),
      date: '2026-10-26',
      seed: 7,
    })
    expect(provenance(withSeed({ ...recorded, git_sha: null, generated_at: null }, null))).toEqual({
      command: recorded.generated_by,
      sha: null,
      date: null,
      seed: null,
    })
  })
})

describe('ProvenanceLine', () => {
  it('adds the seed when the fixture records one, including seed 0', () => {
    const { rerender } = render(<ProvenanceLine fixture={withSeed(recorded, 0)} />)
    expect(screen.getByTestId('caption')).toHaveTextContent('2026-10-26, seed 0. Preliminary.')
    rerender(<ProvenanceLine fixture={withSeed(recorded, null)} />)
    expect(screen.getByTestId('caption')).not.toHaveTextContent('seed')
  })

  it('renders nothing for a provisional fixture', () => {
    const { container } = render(<ProvenanceLine fixture={provisional} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a static mono caption with the command, 7-character SHA, date and honesty note', () => {
    render(<ProvenanceLine fixture={withSeed(recorded, null)} />)
    const caption = screen.getByTestId('caption')
    expect(caption).toHaveTextContent(
      'Recorded by python -m plumbline.record_fixtures --fixture worked_example, commit 0123456, 2026-10-26. Preliminary. Not peer reviewed.',
    )
    expect(caption.querySelectorAll('code')).toHaveLength(2)
    expect(caption).not.toHaveAttribute('aria-live')
    expect(caption.closest('[aria-live]')).toBeNull()
  })
})
