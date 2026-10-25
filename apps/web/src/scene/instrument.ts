import type * as THREE from 'three'
import { poseAt } from '@/landing/choreography'
import { useLanding } from '@/state/landing'
import { useSession } from '@/state/session'

export type Instrument = 'circuit' | 'roast'

/** Which instrument is mostly showing; changes only when the crossfade crosses half way. */
export function useInstrument(): Instrument {
  const landingRoast = useLanding((s) =>
    s.sceneMode === 'landing' ? poseAt(s.progress).roastMix >= 0.5 : null,
  )
  const simRoast = useSession((s) => s.domain === 'thermometer')
  return (landingRoast ?? simRoast) ? 'roast' : 'circuit'
}

interface FadeMaterial extends THREE.Material {
  userData: { baseOpacity?: number; baseTransparent?: boolean }
}

/** Multiplies every material's own opacity by `opacity`; hides the group at zero. */
export function applyGroupOpacity(group: THREE.Object3D, opacity: number): void {
  group.visible = opacity > 0.001
  if (!group.visible) return
  group.traverse((obj) => {
    const material = (obj as THREE.Mesh).material as FadeMaterial | FadeMaterial[] | undefined
    if (!material) return
    for (const m of Array.isArray(material) ? material : [material]) {
      m.userData.baseOpacity ??= m.opacity
      m.userData.baseTransparent ??= m.transparent
      m.opacity = m.userData.baseOpacity * opacity
      const transparent = m.userData.baseTransparent || opacity < 1
      if (m.transparent !== transparent) {
        m.transparent = transparent
        m.needsUpdate = true
      }
    }
  })
}
