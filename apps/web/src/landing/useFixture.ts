import { useEffect, useState } from 'react'
import type { FixtureT } from '@/engine/schemas'
import { loadFixture } from '@/state/replay'

export type FixtureLoad =
  | { status: 'loading' }
  | { status: 'ready'; fixture: FixtureT }
  | { status: 'missing'; sentence: string }

const cache = new Map<string, Promise<FixtureT>>()

function load(id: string): Promise<FixtureT> {
  const hit = cache.get(id)
  if (hit) return hit
  const promise = loadFixture(id)
  cache.set(id, promise)
  return promise
}

/** Loads a recorded fixture once per page view. Missing recordings are a normal state, not a crash. */
export function useFixture(id: string): FixtureLoad {
  const [state, setState] = useState<FixtureLoad>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    load(id).then(
      (fixture) => alive && setState({ status: 'ready', fixture }),
      (error: unknown) =>
        alive &&
        setState({
          status: 'missing',
          sentence:
            error instanceof Error ? error.message : 'That recording is not available here.',
        }),
    )
    return () => {
      alive = false
    }
  }, [id])
  return state
}

export type FixturesLoad =
  | { status: 'loading' }
  | { status: 'ready'; fixtures: FixtureT[] }
  | { status: 'missing'; sentence: string }

/** Loads several recordings once per page view, in order. Each is its own lazy chunk. */
export function useFixtures(ids: readonly string[]): FixturesLoad {
  const [state, setState] = useState<FixturesLoad>({ status: 'loading' })
  const key = ids.join(',')
  useEffect(() => {
    let alive = true
    Promise.all(key.split(',').map(load)).then(
      (fixtures) => alive && setState({ status: 'ready', fixtures }),
      () =>
        alive &&
        setState({ status: 'missing', sentence: 'The recorded runs are not available here.' }),
    )
    return () => {
      alive = false
    }
  }, [key])
  return state
}
