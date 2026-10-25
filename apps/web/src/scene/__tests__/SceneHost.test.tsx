import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLanding } from '@/state/landing'
import { usePrefs } from '@/state/prefs'
import { SceneHost } from '../SceneHost'

const mounts = vi.hoisted(() => ({ count: 0 }))
const webgl = vi.hoisted(() => ({ supported: true }))

vi.mock('@/lib/webgl', () => ({ webglSupported: () => webgl.supported }))
vi.mock('../SceneRoot', () => ({
  default: function FakeCanvas() {
    useEffect(() => {
      mounts.count += 1
    }, [])
    return <canvas data-testid="fake-canvas" />
  },
}))

function Slot() {
  return <div id="scene-slot" data-testid="slot" />
}

beforeEach(() => {
  mounts.count = 0
  webgl.supported = true
  usePrefs.setState({ textOnly: false })
  useLanding.setState({ sceneMode: 'hidden' })
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SceneHost mounting seam', () => {
  it('renders nothing while hidden', () => {
    render(<SceneHost />)
    expect(screen.queryByTestId('scene')).toBeNull()
  })

  it('mounts as a fixed layer on the landing', async () => {
    act(() => useLanding.setState({ sceneMode: 'landing' }))
    render(<SceneHost />)
    const scene = await screen.findByTestId('scene')
    expect(scene).toHaveAttribute('role', 'img')
    const layer = scene.closest('.fixed')
    expect(layer).not.toBeNull()
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer).toHaveClass('pointer-events-none')
  })

  it('moves into #scene-slot in sim mode without remounting the canvas', async () => {
    act(() => useLanding.setState({ sceneMode: 'landing' }))
    render(
      <>
        <SceneHost />
        <Slot />
      </>,
    )
    await screen.findByTestId('fake-canvas')
    expect(mounts.count).toBe(1)
    act(() => useLanding.setState({ sceneMode: 'sim' }))
    const slot = screen.getByTestId('slot')
    expect(slot.contains(screen.getByTestId('scene'))).toBe(true)
    expect(screen.getByTestId('scene').closest('[aria-hidden]')).toBeNull()
    expect(mounts.count).toBe(1)
  })

  it('keeps the canvas mounted off the page when the sim leaves, and reuses it on return', async () => {
    function App({ showSlot }: { showSlot: boolean }) {
      return (
        <>
          <SceneHost />
          {showSlot ? <Slot /> : null}
        </>
      )
    }
    act(() => useLanding.setState({ sceneMode: 'landing' }))
    const { rerender } = render(<App showSlot />)
    await screen.findByTestId('fake-canvas')
    act(() => useLanding.setState({ sceneMode: 'sim' }))
    // Leaving /sim: the page removes its slot, then the scene mode goes hidden.
    rerender(<App showSlot={false} />)
    act(() => useLanding.setState({ sceneMode: 'hidden' }))
    expect(screen.queryByTestId('scene')).toBeNull()
    expect(mounts.count).toBe(1)
    rerender(<App showSlot />)
    act(() => useLanding.setState({ sceneMode: 'sim' }))
    expect(screen.getByTestId('slot').contains(await screen.findByTestId('scene'))).toBe(true)
    expect(mounts.count).toBe(1)
  })

  it('finds a slot that renders after the scene', async () => {
    act(() => useLanding.setState({ sceneMode: 'sim' }))
    const { rerender } = render(<SceneHost />)
    expect(screen.queryByTestId('scene')).toBeNull()
    rerender(
      <>
        <SceneHost />
        <Slot />
      </>,
    )
    const scene = await screen.findByTestId('scene')
    expect(screen.getByTestId('slot').contains(scene)).toBe(true)
  })

  it('mounts nothing in sim mode when there is no slot (text-only view)', () => {
    act(() => useLanding.setState({ sceneMode: 'sim' }))
    render(<SceneHost />)
    expect(screen.queryByTestId('scene')).toBeNull()
  })

  it('shows the notice in the slot when WebGL is missing', () => {
    webgl.supported = false
    act(() => useLanding.setState({ sceneMode: 'sim' }))
    render(
      <>
        <SceneHost />
        <Slot />
      </>,
    )
    expect(screen.getByTestId('slot')).toHaveTextContent('3D view unavailable here')
  })

  it('stays away when the viewer chose text only', () => {
    usePrefs.setState({ textOnly: true })
    act(() => useLanding.setState({ sceneMode: 'landing' }))
    render(<SceneHost />)
    expect(screen.queryByTestId('scene')).toBeNull()
  })
})
