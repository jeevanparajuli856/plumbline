import { useRef, type ReactNode } from 'react'
import type * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { applyGroupOpacity } from './instrument'
import { livePose } from './livePose'

interface InstrumentSwitchProps {
  circuit: ReactNode
  roast: ReactNode
}

/** Crossfades the breadboard and the roast by livePose.roastMix (written by CameraRig). */
export function InstrumentSwitch({ circuit, roast }: InstrumentSwitchProps) {
  const circuitRef = useRef<THREE.Group>(null)
  const roastRef = useRef<THREE.Group>(null)
  const applied = useRef(-1)

  useFrame(() => {
    const mix = livePose.roastMix
    if (mix === applied.current || !circuitRef.current || !roastRef.current) return
    applyGroupOpacity(circuitRef.current, 1 - mix)
    applyGroupOpacity(roastRef.current, mix)
    applied.current = mix
  }, -1)

  return (
    <>
      <group ref={circuitRef} name="circuit-scene">
        {circuit}
      </group>
      <group ref={roastRef} name="roast-scene">
        {roast}
      </group>
    </>
  )
}
