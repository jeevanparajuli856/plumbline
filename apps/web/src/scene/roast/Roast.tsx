import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type * as THREE from 'three'
import { ROAST_LAYER } from '../livePose'
import { ROAST_CENTRE } from '../roastLayout'
import { DepthBands } from './DepthBands'
import { DepthHitboxes } from './DepthHitboxes'
import { ThermoProbe } from './ThermoProbe'

interface RoastProps {
  children?: ReactNode
}

/**
 * Simulated roast cross-section for the thermometer domain. Lives on its own layer so the
 * circuit's one-shot ContactShadows never bakes it in. The SIMULATED badge lives in the DOM.
 */
export function Roast({ children }: RoastProps) {
  const inner = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    inner.current?.traverse((o) => o.layers.set(ROAST_LAYER))
  }, [])
  return (
    <group ref={inner} name="roast">
      <group position={ROAST_CENTRE}>
        <DepthBands />
      </group>
      <ThermoProbe />
      <DepthHitboxes />
      {children}
    </group>
  )
}
