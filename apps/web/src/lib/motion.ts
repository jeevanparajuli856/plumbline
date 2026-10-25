/** Motion scale shared by DOM transitions, motion/react and the 3D scene. Values mirror tokens.css. */
export const motionTokens = {
  duration: { instant: 0.08, fast: 0.18, normal: 0.35, slow: 0.6, crawl: 1.0 },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as const,
    sharp: [0.4, 0, 0.2, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
    linear: [0, 0, 1, 1] as const,
  },
} as const

export const springs = {
  snappy: { stiffness: 300, damping: 30 },
  gentle: { stiffness: 120, damping: 14 },
  bouncy: { stiffness: 400, damping: 10 },
  instant: { stiffness: 600, damping: 35 },
  release: { stiffness: 200, damping: 20 },
} as const

export type SpringPreset = keyof typeof springs
