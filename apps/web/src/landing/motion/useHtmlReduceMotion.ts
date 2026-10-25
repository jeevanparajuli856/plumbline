import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-reduce-motion'],
  })
  return () => observer.disconnect()
}

function isReduced(): boolean {
  return document.documentElement.hasAttribute('data-reduce-motion')
}

/** True while `<html data-reduce-motion>` is present (the in-page Reduce motion switch). */
export function useHtmlReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, isReduced, () => false)
}
