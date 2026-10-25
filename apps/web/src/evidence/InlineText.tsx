import type { Inline } from './markdown'

interface InlineTextProps {
  parts: readonly Inline[]
}

/** Renders parsed inline markdown as React nodes: code in mono, URLs as links, the rest as text. */
export function InlineText({ parts }: InlineTextProps) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === 'code')
          return (
            <code
              key={i}
              className="break-words rounded-hard bg-surface-2 px-1 font-mono text-[1em]"
            >
              {part.text}
            </code>
          )
        if (part.kind === 'link')
          return (
            <a
              key={i}
              href={part.href}
              className="break-all font-medium text-inferred underline underline-offset-4 hover:decoration-2"
              rel="noreferrer"
            >
              {part.text}
            </a>
          )
        return <span key={i}>{part.text}</span>
      })}
    </>
  )
}
