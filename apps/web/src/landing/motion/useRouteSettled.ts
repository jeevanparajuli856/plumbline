import { useEffect, useState } from 'react'

const ROUTE_TRANSITION_ATTRIBUTE = 'data-route-transition'

/**
 * A counter that goes up each time a page transition ends (`<html data-route-transition>` is
 * removed by ui/routeTransition). React tears the entering page's layout effects down partway
 * through the view transition (observed in Chrome), which left every tween and trigger reverted
 * after a client-side navigation; the motion setup depends on this counter so it rebuilds once
 * the transition is over.
 */
export function useRouteSettled(): number {
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    const root = document.documentElement
    let wasRunning = root.hasAttribute(ROUTE_TRANSITION_ATTRIBUTE)
    const observer = new MutationObserver(() => {
      const isRunning = root.hasAttribute(ROUTE_TRANSITION_ATTRIBUTE)
      if (wasRunning && !isRunning) setGeneration((n) => n + 1)
      wasRunning = isRunning
    })
    observer.observe(root, { attributes: true, attributeFilter: [ROUTE_TRANSITION_ATTRIBUTE] })
    return () => observer.disconnect()
  }, [])
  return generation
}
