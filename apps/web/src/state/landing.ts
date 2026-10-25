import { create } from 'zustand'

export type LandingSection =
  | 'mast'
  | 'research'
  | 'problem'
  | 'play'
  | 'how'
  | 'generalize'
  | 'product'
  | 'ladder'
  | 'evidence'
  | 'close'

export type SceneMode = 'landing' | 'sim' | 'hidden'

interface LandingState {
  progress: number
  section: LandingSection
  sceneMode: SceneMode
  lastScrollAt: number
  setProgress(progress: number, section: LandingSection): void
  setSceneMode(mode: SceneMode): void
}

/** Written by the landing's scroll listener, read inside useFrame via getState(). */
export const useLanding = create<LandingState>((set) => ({
  progress: 0,
  section: 'mast',
  sceneMode: 'hidden',
  lastScrollAt: 0,
  setProgress: (progress, section) => set({ progress, section, lastScrollAt: Date.now() }),
  setSceneMode: (sceneMode) => set({ sceneMode }),
}))
