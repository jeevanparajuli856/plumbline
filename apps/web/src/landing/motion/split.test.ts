import { splitWords } from './split'

function heading(html: string): HTMLElement {
  const el = document.createElement('h1')
  el.innerHTML = html
  document.body.append(el)
  return el
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('splitWords', () => {
  it('wraps_each_word_in_an_inline_block_span_and_keeps_spaces_as_text_nodes', () => {
    const el = heading('Measurement you can trust')
    const split = splitWords(el, { label: true })
    expect(split).not.toBeNull()
    expect(split!.words).toHaveLength(4)
    expect(split!.words.map((w) => w.textContent)).toEqual(['Measurement', 'you', 'can', 'trust'])
    expect(split!.words.every((w) => w.style.display === 'inline-block')).toBe(true)
    const between = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE)
    expect(between.map((n) => n.textContent)).toEqual([' ', ' ', ' '])
    expect(el.textContent).toBe('Measurement you can trust')
  })

  it('keeps_the_accessible_name_equal_to_the_original_text_when_labelled', () => {
    const el = heading('  Measurement you can\n trust without looking.  ')
    const split = splitWords(el, { label: true })!
    expect(el.getAttribute('aria-label')).toBe('Measurement you can trust without looking.')
    expect(split.words.every((w) => w.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  it('leaves_spans_in_the_accessibility_tree_when_not_labelled', () => {
    const el = heading('A quote here')
    const split = splitWords(el, { label: false })!
    expect(el.hasAttribute('aria-label')).toBe(false)
    expect(split.words.some((w) => w.hasAttribute('aria-hidden'))).toBe(false)
  })

  it('restores_the_original_text_node_and_attributes', () => {
    const el = heading('Measurement you can trust')
    const original = el.firstChild
    const split = splitWords(el, { label: true })!
    split.restore()
    expect(el.childNodes).toHaveLength(1)
    expect(el.firstChild).toBe(original)
    expect(el.hasAttribute('aria-label')).toBe(false)
  })

  it('restores_a_pre_existing_aria_label', () => {
    const el = heading('Some words')
    el.setAttribute('aria-label', 'Authored name')
    splitWords(el, { label: true })!.restore()
    expect(el.getAttribute('aria-label')).toBe('Authored name')
  })

  it('refuses_elements_that_contain_child_elements', () => {
    const el = heading('Some <em>marked</em> words')
    expect(splitWords(el, { label: true })).toBeNull()
    expect(el.innerHTML).toBe('Some <em>marked</em> words')
  })

  it('refuses_empty_text', () => {
    expect(splitWords(heading('   '), { label: true })).toBeNull()
  })
})
