export interface SplitWords {
  words: HTMLElement[]
  restore(): void
}

interface SplitOptions {
  /** Put the full text on the element's aria-label and hide the word spans. Only for elements that may be named (headings). */
  label: boolean
}

function wordSpan(word: string, hidden: boolean): HTMLSpanElement {
  const span = document.createElement('span')
  span.textContent = word
  span.style.display = 'inline-block'
  span.dataset.motionWord = ''
  if (hidden) span.setAttribute('aria-hidden', 'true')
  return span
}

/**
 * Wraps each word of a plain-text element in an inline-block span; whitespace stays as text nodes
 * so wrapping is unchanged. Returns null for elements with child elements or no words.
 */
export function splitWords(el: HTMLElement, { label }: SplitOptions): SplitWords | null {
  const original = Array.from(el.childNodes)
  if (original.some((node) => node.nodeType !== Node.TEXT_NODE)) return null
  const text = el.textContent ?? ''
  if (text.trim() === '') return null

  const priorLabel = el.getAttribute('aria-label')
  const words: HTMLElement[] = []
  const nodes = text
    .split(/(\s+)/)
    .filter((part) => part !== '')
    .map((part) => {
      if (/^\s+$/.test(part)) return document.createTextNode(part)
      const span = wordSpan(part, label)
      words.push(span)
      return span
    })
  el.replaceChildren(...nodes)
  if (label) el.setAttribute('aria-label', text.trim().replace(/\s+/g, ' '))

  return {
    words,
    restore() {
      el.replaceChildren(...original)
      if (!label) return
      if (priorLabel === null) el.removeAttribute('aria-label')
      else el.setAttribute('aria-label', priorLabel)
    },
  }
}
