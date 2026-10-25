import ReactThreeTestRenderer from '@react-three/test-renderer'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'
import type { Catalog, ReadingEntry } from '@/state/types'
import { REVEAL_TOTAL_S } from '../easing'
import { siteX } from '../layout'
import { SceneContent } from '../SceneContent'
import { readSceneTokens } from '../tokens'
import { animationCount } from '../useAnimating'

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

let mounted: Renderer | null = null

async function mount(): Promise<Renderer> {
  mounted = await ReactThreeTestRenderer.create(
    <SceneContent labels={false} controls={false} benchShadow={false} />,
  )
  return mounted
}

const object = (r: Renderer, name: string) =>
  r.scene.findByProps({ name }).instance as THREE.Object3D

const colourOf = (r: Renderer, name: string) =>
  ((object(r, name) as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHexString()

const tokenHex = (value: string) => new THREE.Color(value).getHexString()

const FAKE_CLOCK: Parameters<typeof vi.useFakeTimers>[0] = {
  toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'],
}

/** Fake wall clock (timers and performance.now) plus rendered frames, in lockstep at `fps`. */
async function play(r: Renderer, seconds: number, fps: number) {
  const frames = Math.round(seconds * fps)
  for (let i = 0; i < frames; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000 / fps)
      await r.advanceFrames(1, 1 / fps)
    })
  }
}

beforeEach(() => {
  useSession.setState(useSession.getInitialState(), true)
  useSession.setState({ catalog, phase: 'awaiting_reading', aimedSite: 2 })
  useLanding.setState({ sceneMode: 'sim', progress: 0 })
  mockReducedMotion(false)
})

afterEach(async () => {
  // Unmount even when an assertion failed, so animation leases never leak between tests.
  await mounted?.unmount()
  mounted = null
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
  })

  it('aims the probe at the clicked row (0-based) and the probe follows', async () => {
    const r = await mount()
    await r.fireEvent(r.scene.findByProps({ name: 'row-hitbox-5' }), 'click')
    expect(useSession.getState().aimedSite).toBe(4)
    await act(async () => r.advanceFrames(120, 1 / 30))
    expect(object(r, 'probe').position.x).toBeCloseTo(siteX(4), 3)
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
  })

  it('finishes a reveal immediately with the token under reduced motion', async () => {
    mockReducedMotion(true)
    const finishReveal = vi.fn()
    useSession.setState({ finishReveal })
    await mount()
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        readings: [reading],
        reveal: { landedSite: 1, token: 7, next: 'awaiting_reading' },
      }),
    )
    expect(finishReveal).toHaveBeenCalledWith(7)
  })

  it('animates the reveal, then finishes with the token and leaves the probe on the landed row', async () => {
    vi.useFakeTimers(FAKE_CLOCK)
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
    await play(r, 0.7, 30)
    expect(object(r, 'probe').position.x).toBeCloseTo(siteX(1), 4)
    expect(finishReveal).not.toHaveBeenCalled()
    await play(r, REVEAL_TOTAL_S, 30)
    expect(finishReveal).toHaveBeenCalledTimes(1)
    expect(finishReveal).toHaveBeenCalledWith(9)
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
  })

  it('lands on the landed row before finishReveal even at 15 fps', async () => {
    vi.useFakeTimers(FAKE_CLOCK)
    const r = await mount()
    let xAtFinish = Number.NaN
    useSession.setState({
      finishReveal: vi.fn(() => {
        xAtFinish = object(r, 'probe').position.x
      }),
    })
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        readings: [reading],
        reveal: { landedSite: 1, token: 5, next: 'awaiting_reading' },
      }),
    )
    await play(r, REVEAL_TOTAL_S + 0.2, 15)
    expect(xAtFinish).toBeCloseTo(siteX(1), 4)
  })

  it('finishes only the newest token when a reveal is replaced mid-flight', async () => {
    vi.useFakeTimers(FAKE_CLOCK)
    const finishReveal = vi.fn()
    useSession.setState({ finishReveal })
    const r = await mount()
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        readings: [reading],
        reveal: { landedSite: 1, token: 1, next: 'awaiting_reading' },
      }),
    )
    await play(r, 0.3, 30)
    await act(async () =>
      useSession.setState({ reveal: { landedSite: 4, token: 2, next: 'awaiting_reading' } }),
    )
    await play(r, REVEAL_TOTAL_S + 0.2, 30)
    expect(finishReveal.mock.calls).toEqual([[2]])
    expect(object(r, 'probe').position.x).toBeCloseTo(siteX(4), 4)
  })

  it('keeps the warning outline hidden while revealing and shows it after', async () => {
    const warning = { toldSite: 2, likelySite: 1, pOffSite: 1, text: 'Warning.' }
    const r = await mount()
    await act(async () =>
      useSession.setState({
        phase: 'revealing',
        warning,
        readings: [{ ...reading, warning }],
        reveal: { landedSite: 1, token: 4, next: 'awaiting_reading' },
      }),
    )
    expect(object(r, 'warning-outline').visible).toBe(false)
    await act(async () => useSession.setState({ phase: 'awaiting_reading', reveal: null }))
    expect(object(r, 'warning-outline').visible).toBe(true)
    expect(object(r, 'warning-outline').position.x).toBeCloseTo(siteX(2), 9)
  })

  it('draws strokes and edges in the 3:1 tokens, not the pale fills', async () => {
    const t = readSceneTokens()
    const r = await mount()
    expect(colourOf(r, 'told-outline')).toBe(tokenHex(t.inferred))
    expect(colourOf(r, 'plumb-bob')).toBe(tokenHex(t.inferred))
    expect(colourOf(r, 'landed-edge')).toBe(tokenHex(t.measured))
    expect(colourOf(r, 'placement-glow-edge')).toBe(tokenHex(t.inferred))
  })

  it('uploads placement instance buffers only on frames where a strip moved', async () => {
    const r = await mount()
    const glow = object(r, 'placement-glow') as THREE.InstancedMesh
    const versions = () => [glow.instanceMatrix.version, glow.instanceColor?.version ?? -1]
    await act(async () => useSession.setState({ placement: [0, 0.8, 0.2, 0, 0, 0] }))
    await act(async () => r.advanceFrames(240, 1 / 30))
    const settled = versions()
    await act(async () => r.advanceFrames(60, 1 / 30))
    expect(versions()).toEqual(settled)
    await act(async () => useSession.setState({ placement: [0, 0.1, 0.9, 0, 0, 0] }))
    await act(async () => r.advanceFrames(1, 1 / 30))
    expect(versions()[0]).toBeGreaterThan(settled[0]!)
  })

  it('holds a tremor lease only for the circuit while awaiting a reading', async () => {
    const r = await mount()
    expect(animationCount()).toBe(1)
    await act(async () => useSession.setState({ phase: 'resolved' }))
    expect(animationCount()).toBe(0)
    await act(async () => useSession.setState({ phase: 'awaiting_reading', domain: 'thermometer' }))
    expect(animationCount()).toBe(0)
    await act(async () => useSession.setState({ domain: 'circuit' }))
    expect(animationCount()).toBe(1)
    await r.unmount()
    mounted = null
    expect(animationCount()).toBe(0)
  })
})
