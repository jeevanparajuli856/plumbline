/**
 * Route changes animate through a React <ViewTransition> around the Outlet, keyed by path (App.tsx);
 * React Router already runs navigations in startTransition, so every Link and navigate() takes part.
 */

/** The enter and exit class: the lift-and-rise in viewTransition.css, or none. */
export function routeTransitionClass(isReduced: boolean): 'route' | 'none' {
  return isReduced ? 'none' : 'route'
}

/**
 * onEnter for the route boundary: marks html for the transition so the root override in
 * viewTransition.css applies to route changes only. React calls the cleanup when it finishes.
 */
export function markRouteTransition(): () => void {
  const root = document.documentElement
  root.dataset.routeTransition = 'true'
  return () => {
    delete root.dataset.routeTransition
  }
}
