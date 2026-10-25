/**
 * Damped per-frame values the CameraRig writes (useFrame priority -1) and other scene parts
 * read in their own useFrame. Mutable on purpose: per-frame state stays out of React.
 */
export const livePose = {
  /** 0 = circuit only, 1 = roast only. */
  roastMix: 0,
  /** 0 = layers together, 1 = fully separated. */
  explode: 0,
  plumbOpacity: 1,
}

/** Three.js layer for the roast, so the circuit's ContactShadows never capture it. */
export const ROAST_LAYER = 1
