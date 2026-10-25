import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useLanding } from '@/state/landing'
import { Labels } from '../Labels'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>
const { act } = ReactThreeTestRenderer

let mounted: Renderer | null = null
let connectEvents: Connect | null = null

type Connect = (target: HTMLElement) => void

function CaptureConnect({ onReady }: { onReady: (connect: Connect) => void }) {
  const events = useThree((s) => s.events)
  const set = useThree((s) => s.set)
  useEffect(() => {
    onReady((target) => set({ events: { ...events, connected: target } }))
  }, [events, set, onReady])
  return null
}

const groups = (r: Renderer, name: string) => r.scene.findAll((n) => n.props.name === name)

afterEach(async () => {
  await mounted?.unmount()
  mounted = null
  connectEvents = null
  document.body.innerHTML = ''
})

describe('Labels', () => {
  it('waits for the connected event target, so drei Html never re-mounts on a new target', async () => {
    useLanding.setState({ sceneMode: 'sim' })
    mounted = await ReactThreeTestRenderer.create(
      <>
        <CaptureConnect
          onReady={(connect) => {
            connectEvents = connect
          }}
        />
        <Labels instrument="circuit" />
      </>,
    )
    expect(groups(mounted, 'circuit-labels')).toHaveLength(0)
    const target = document.body.appendChild(document.createElement('div'))
    await act(async () => connectEvents?.(target))
    expect(groups(mounted, 'circuit-labels')).toHaveLength(1)
    expect(groups(mounted, 'roast-labels')).toHaveLength(1)
  })
})
