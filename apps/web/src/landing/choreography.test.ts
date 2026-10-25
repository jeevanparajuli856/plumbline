import {
  BOARD_LEFT_X,
  BOARD_RIGHT_X,
  KEYFRAMES,
  SECTION_ORDER,
  STICKY_STATES,
  locate,
  poseAt,
  progressOf,
  restingProgress,
  stickyStateAt,
  type ScenePose,
} from './choreography'

const NUMERIC_FIELDS = (pose: ScenePose): number[] => [
  ...pose.camera,
  ...pose.target,
  pose.fov,
  pose.roastMix,
  pose.explode,
  pose.plumbOpacity,
]

function sample(from: number, to: number, n = 40): number[] {
  return Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n)
}

describe('poseAt', () => {
  it('returns each keyframe pose exactly at its progress', () => {
    for (const k of KEYFRAMES) {
      const pose = poseAt(k.at)
      expect(pose.camera).toEqual(k.pose.camera.map((v) => expect.closeTo(v, 9)))
      expect(pose.target).toEqual(k.pose.target.map((v) => expect.closeTo(v, 9)))
      expect(pose.fov).toBeCloseTo(k.pose.fov, 9)
      expect(pose.roastMix).toBeCloseTo(k.pose.roastMix, 9)
      expect(pose.explode).toBeCloseTo(k.pose.explode, 9)
      expect(pose.plumbOpacity).toBeCloseTo(k.pose.plumbOpacity, 9)
    }
  })

  it('keeps keyframes in strictly ascending order inside [0, 1]', () => {
    KEYFRAMES.forEach((k, i) => {
      expect(k.at).toBeGreaterThanOrEqual(0)
      expect(k.at).toBeLessThanOrEqual(1)
      if (i > 0) expect(k.at).toBeGreaterThan(KEYFRAMES[i - 1]!.at)
    })
    expect(KEYFRAMES[0]!.at).toBe(0)
    expect(KEYFRAMES[KEYFRAMES.length - 1]!.at).toBe(1)
  })

  it('interpolates monotonically between neighbouring keyframes', () => {
    for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
      const a = KEYFRAMES[i]!.at
      const b = KEYFRAMES[i + 1]!.at
      const series = sample(a, b).map((x) => NUMERIC_FIELDS(poseAt(x)))
      for (let field = 0; field < series[0]!.length; field += 1) {
        const values = series.map((s) => s[field]!)
        const rising = values.every((v, j) => j === 0 || v >= values[j - 1]! - 1e-12)
        const falling = values.every((v, j) => j === 0 || v <= values[j - 1]! + 1e-12)
        expect(rising || falling).toBe(true)
      }
    }
  })

  it('is halfway-ish between keyframes, not stuck on either end', () => {
    const a = KEYFRAMES[0]!
    const b = KEYFRAMES[1]!
    const mid = poseAt((a.at + b.at) / 2)
    expect(mid.camera[1]).toBeCloseTo((a.pose.camera[1] + b.pose.camera[1]) / 2, 9)
  })

  it('clamps out-of-range and non-finite progress', () => {
    expect(poseAt(-3)).toEqual(poseAt(0))
    expect(poseAt(7)).toEqual(poseAt(1))
    expect(poseAt(Number.NaN)).toEqual(poseAt(0))
    expect(poseAt(Number.POSITIVE_INFINITY)).toEqual(poseAt(0))
  })

  it('explodes only inside how', () => {
    for (const x of sample(0, 1, 400)) {
      const pose = poseAt(x)
      if (locate(x).section !== 'how') expect(pose.explode).toBe(0)
    }
    expect(poseAt(progressOf('how', 0.75)).explode).toBe(1)
  })

  it('mixes in the roast only inside generalize, and names the scene from the mix', () => {
    for (const x of sample(0, 1, 400)) {
      const pose = poseAt(x)
      if (locate(x).section !== 'generalize') expect(pose.roastMix).toBe(0)
      expect(pose.scene).toBe(pose.roastMix >= 0.5 ? 'roast' : 'circuit')
    }
    expect(poseAt(progressOf('generalize', 0.4)).scene).toBe('roast')
  })

  it('walks mathLine 0..5 across how and is -1 elsewhere', () => {
    const lines = sample(progressOf('how', 0), progressOf('how', 0.999), 600).map(
      (x) => poseAt(x).mathLine,
    )
    expect(lines[0]).toBe(0)
    expect(lines[lines.length - 1]).toBe(5)
    expect(new Set(lines)).toEqual(new Set([0, 1, 2, 3, 4, 5]))
    lines.forEach((v, i) => i === 0 || expect(v).toBeGreaterThanOrEqual(lines[i - 1]!))
    expect(poseAt(progressOf('play', 0.5)).mathLine).toBe(-1)
    expect(poseAt(progressOf('generalize', 0)).mathLine).toBe(-1)
  })

  it('fades the plumb line out across ladder and back to rest at close', () => {
    expect(poseAt(progressOf('ladder', 0)).plumbOpacity).toBe(1)
    expect(poseAt(progressOf('evidence', 0)).plumbOpacity).toBe(0)
    expect(poseAt(1).plumbOpacity).toBe(1)
  })
})

describe('framing', () => {
  const dist = (pose: ScenePose) => Math.hypot(...pose.camera.map((c, i) => c - pose.target[i]!))

  it('keeps the camera far enough back that the board never fills the frame', () => {
    for (const k of KEYFRAMES) expect(dist(poseAt(k.at))).toBeGreaterThanOrEqual(0.28)
  })

  it('puts the board right of the text column, except in play where the panel is on the right', () => {
    for (const k of KEYFRAMES) {
      const { section } = locate(k.at)
      const pose = poseAt(k.at)
      if (section === 'play' && k.at > progressOf('play', 0))
        expect(pose.target[0]).toBe(BOARD_LEFT_X)
      if (['mast', 'research', 'problem', 'close'].includes(section)) {
        expect(pose.target[0]).toBeLessThanOrEqual(BOARD_RIGHT_X)
      }
      // The keyframe at how f = 0 is play's resolved pose; the move starts there.
      if ((section === 'how' || section === 'generalize') && k.at > progressOf('how', 0)) {
        expect(pose.target[0]).toBeLessThan(0)
      }
    }
  })

  it('views the exploded layers from an angle, not straight down', () => {
    const pose = poseAt(progressOf('how', 0.75))
    const d = pose.camera.map((c, i) => c - pose.target[i]!)
    const elevation = Math.atan2(d[1]!, Math.hypot(d[0]!, d[2]!))
    expect(elevation).toBeLessThan((45 * Math.PI) / 180)
  })
})

describe('sections and named states', () => {
  it('lists the ten sections in page order', () => {
    expect(SECTION_ORDER).toEqual([
      'mast',
      'research',
      'problem',
      'play',
      'how',
      'generalize',
      'product',
      'ladder',
      'evidence',
      'close',
    ])
  })

  it('gives every sticky scene three to five named states', () => {
    for (const states of Object.values(STICKY_STATES)) {
      expect(states.length).toBeGreaterThanOrEqual(3)
      expect(states.length).toBeLessThanOrEqual(5)
    }
  })

  it('puts the camera-moving named states on keyframes so a snapped scene rests on one', () => {
    const stops = new Set(KEYFRAMES.map((k) => k.at.toFixed(9)))
    const onKeyframe = (section: 'play' | 'how' | 'generalize', name: string) => {
      const state = STICKY_STATES[section].find((s) => s.name === name)!
      return stops.has(progressOf(section, state.at).toFixed(9))
    }
    for (const s of STICKY_STATES.play) expect(onKeyframe('play', s.name)).toBe(true)
    for (const s of STICKY_STATES.generalize) expect(onKeyframe('generalize', s.name)).toBe(true)
    // `choose` and `refuse` change only the lit math line; the camera keeps moving between them.
    for (const name of ['hand', 'update', 'layers']) expect(onKeyframe('how', name)).toBe(true)
  })

  it('locates progress into a section and fraction', () => {
    expect(locate(0)).toEqual({ section: 'mast', f: 0 })
    expect(locate(1)).toEqual({ section: 'close', f: 1 })
    expect(locate(progressOf('how', 0.5)).section).toBe('how')
    expect(locate(progressOf('how', 0.5)).f).toBeCloseTo(0.5, 9)
  })

  it('names the nearest sticky state, and null outside sticky sections', () => {
    expect(stickyStateAt(progressOf('play', 0.05))).toEqual({
      section: 'play',
      state: 'instructed',
    })
    expect(stickyStateAt(progressOf('play', 0.7))).toEqual({ section: 'play', state: 'landed' })
    expect(stickyStateAt(progressOf('generalize', 0.5))).toEqual({
      section: 'generalize',
      state: 'roast',
    })
    expect(stickyStateAt(progressOf('research', 0.5))).toBeNull()
  })

  it('quantizes to the nearest keyframe for reduced motion', () => {
    expect(restingProgress(0.004)).toBe(0)
    expect(restingProgress(progressOf('play', 0.64))).toBeCloseTo(progressOf('play', 2 / 3), 9)
  })
})
