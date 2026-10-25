import { BeliefOverlay } from './breadboard/BeliefOverlay'
import { Bracket } from './breadboard/Bracket'
import { Breadboard } from './breadboard/Breadboard'
import { Components } from './breadboard/Components'
import { NoisyHand } from './breadboard/NoisyHand'
import { Probe } from './breadboard/Probe'
import { RowHitboxes } from './breadboard/RowHitboxes'
import { CameraRig } from './CameraRig'
import { useInstrument } from './instrument'
import { InstrumentSwitch } from './InstrumentSwitch'
import { Labels } from './Labels'
import { BenchShadow, Lights } from './Lights'
import { PlumbLine } from './PlumbLine'
import { Roast } from './roast/Roast'
import { SceneLifecycle } from './SceneLifecycle'

interface SceneContentProps {
  /** The DOM-backed pieces (Html labels, OrbitControls, ContactShadows) need a real renderer; tests turn them off. */
  labels?: boolean
  controls?: boolean
  benchShadow?: boolean
}

/** Everything inside the Canvas. Renders store state; owns none. */
export function SceneContent({
  labels = true,
  controls = true,
  benchShadow = true,
}: SceneContentProps) {
  const instrument = useInstrument()
  return (
    <>
      <SceneLifecycle />
      <Lights />
      <CameraRig controls={controls} />
      {/* Both branches stay mounted (crossfaded, not swapped), so Probe is the only caller of
          finishReveal for every domain, thermometer reveals included; ThermoProbe never calls it. */}
      <InstrumentSwitch
        circuit={
          <>
            <Breadboard />
            <Components />
            <NoisyHand />
            <BeliefOverlay />
            <Bracket />
            <Probe />
            <RowHitboxes />
            {benchShadow && <BenchShadow />}
          </>
        }
        roast={<Roast />}
      />
      <PlumbLine />
      {labels && <Labels instrument={instrument} />}
    </>
  )
}
