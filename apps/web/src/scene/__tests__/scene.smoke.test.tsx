import ReactThreeTestRenderer from '@react-three/test-renderer'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import type { Catalog, ReadingEntry } from '@/state/types'
import { REVEAL_TOTAL_S } from '../easing'
import { siteX } from '../layout'
import { SceneContent } from '../SceneContent'

// Tell React this environment drives act() itself.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>
const { act } = ReactThreeTestRenderer

const catalog: Catalog = {
  domain: 'circuit',
  simulated: false,
  readingUnit: 'V',
  sigma: 0.02,
  hypotheses: [{ id: 'R3_10x_low', label: 'R3 low', spoken: 'R3 low', description: '' }],
  sites: Array.from({ length: 6 }, (_, i) => ({
    index: i,
    label: `row ${i + 1}`,
    spoken: `row ${i + 1}`,
  })),
  classes: [['R3_10x_low']],
}

const reading: ReadingEntry = {
  step: 0,
  toldSite: 2,
  value: 3.671,
  source: 'replay',
  placement: [0, 1, 0, 0, 0, 0],
  warning: null,
  entropyBits: 1.2,
  top: [],
  acceptedAt: 0,
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  )
}

async function mount(): Promise<Renderer> {
  return ReactThreeTestRenderer.create(
    <SceneContent labels={false} controls={false} benchShadow={false} />,
  )
}

const object = (r: Renderer, name: string) =>
  r.scene.findByProps({ name }).instance as THREE.Object3D

beforeEach(() => {
  useSession.setState(useSession.getInitialState(), true)
  useSession.setState({ catalog, phase: 'awaiting_reading', aimedSite: 2 })
  useLanding.setState({ sceneMode: 'sim', progress: 0 })
  mockReducedMotion(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('scene smoke', () => {
  it('mounts and exposes the named objects', async () => {
    const r = await mount()
    for (const name of [
      'probe',
      'plumb-line',
      'row-hitbox-2',
      'breadboard',
      'roast',
      'told-outline',
    ]) {
      expect(r.scene.findByProps({ name })).toBeTruthy()
    }
    await r.unmount()
  })

  it('keeps hitboxes invisible but still hit by the raycaster', async () => {
    const r = await mount()
    const hitbox = object(r, 'row-hitbox-3')
    expect(hitbox.visible).toBe(false)
    hitbox.updateWorldMatrix(true, false)
    const ray = new THREE.Raycaster(
      new THREE.Vector3(siteX(2), 0.5, 0),
      new THREE.Vector3(0, -1, 0),
    )
    expect(ray.intersectObject(hitbox).length).toBeGreaterThan(0)
    await r.unmount()
  })

  it('aims the probe at the clicked row (0-based) and the probe follows', async () => {
    const r = await mount()
    await r.fireEvent(r.scene.findByProps({ name: 'row-hitbox-5' }), 'click')
    expect(useSession.getState().aimedSite).toBe(4)
    await act(async () => r.advanceFrames(120, 1 / 30))
    expect(object(r, 'probe').position.x).toBeCloseTo(siteX(4), 3)
    await r.unmount()
  })

  it('swaps the circuit for the roast when the domain changes', async () => {
    const r = await mount()
    await act(async () => r.advanceFrames(2, 1 / 30))
    expect(object(r, 'circuit-scene').visible).toBe(true)
    expect(object(r, 'roast-scene').visible).toBe(false)
    await act(async () => useSession.setState({ domain: 'thermometer' }))
    await act(async () => r.advanceFrames(120, 1 / 30))
    expect(object(r, 'circuit-scene').visible).toBe(false)
    expect(object(r, 'roast-scene').visible).toBe(true)
    await r.unmount()
  })

  it('finishes a reveal immediately with the token under reduced motion', async () => {
    mockReducedMotion(true)
    const finishReveal = vi.fn()
    useSession.setState({ finishReveal })
    const r = await mount()
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        readings: [reading],
        reveal: { landedSite: 1, token: 7, next: 'awaiting_reading' },
      }),
    )
    expect(finishReveal).toHaveBeenCalledWith(7)
    await r.unmount()
  })

  it('animates the reveal, then finishes with the token and leaves the probe on the landed row', async () => {
    vi.useFakeTimers()
    const finishReveal = vi.fn()
    useSession.setState({ finishReveal })
    const r = await mount()
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        readings: [reading],
        reveal: { landedSite: 1, token: 9, next: 'awaiting_reading' },
      }),
    )
    expect(finishReveal).not.toHaveBeenCalled()
    await act(async () => r.advanceFrames(40, 1 / 30))
    expect(object(r, 'probe').position.x).toBeCloseTo(siteX(1), 4)
    await act(async () => vi.advanceTimersByTime(REVEAL_TOTAL_S * 1000))
    expect(finishReveal).toHaveBeenCalledWith(9)
    await r.unmount()
  })

  it('never shows the landed fill while revealing, and shows it after', async () => {
    const r = await mount()
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        readings: [{ ...reading, landedSite: 1 }],
        reveal: { landedSite: 1, token: 3, next: 'awaiting_reading' },
      }),
    )
    expect(object(r, 'landed-fill').visible).toBe(false)
    await act(async () => useSession.setState({ phase: 'awaiting_reading', reveal: null }))
    expect(object(r, 'landed-fill').visible).toBe(true)
    expect(object(r, 'landed-fill').position.x).toBeCloseTo(siteX(1), 9)
    await r.unmount()
  })
})
