---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/hooks/**/*.ts"
  - "**/use-*.ts"
---
# React 19

Condensed from ECC `rules/react/*`. Extends `typescript.md`.

## Components
- Container/presentational split: containers own state and effects, presentational components take props.
- Composition over configuration props. Small components, one job.
- Vite SPA, no RSC: never add `"use client"`/server-only patterns.

## State (decision tree)
1. One component -> `useState`. 2. Parent + few children -> lift. 3. Low-frequency global (theme, voice enabled) -> Context.
4. High-frequency shared (belief vector, probe pose, reading log) -> Zustand store in `src/state/`. Select narrowly (`useStore(s => s.belief)`), never the whole store.
5. The 3D scene reads the store with selectors or via `useFrame` + `store.getState()` to avoid re-render per frame.

## Hooks
- Rules of hooks enforced by eslint (`react-hooks/rules-of-hooks: error`, `exhaustive-deps: warn`, treated as error for new code).
- `useEffect` only for external systems (Web Speech, WebSocket to engine, resize). Derived values are computed in render.
- Every subscription/timer/fetch cleans up (`AbortController`, `clearInterval`, `recognition.abort()`).
- Memoize only when a prop identity feeds `React.memo` or another hook, or when profiled as expensive.
- React 19: `use()`, `useTransition` for non-urgent belief re-renders, `useOptimistic` not needed here.

## Accessibility is structural
- Semantic elements first; ARIA only to fill gaps. Every control reachable by keyboard with visible focus.
- The `<LiveRegion>` component mirrors engine events (`instruction`, `reading accepted`, `placement warning`, `diagnosis`) with `aria-live="polite"` and `assertive` for warnings.
- Respect `prefers-reduced-motion` through the `shouldAnimate()` gate from `motion-foundations`.
