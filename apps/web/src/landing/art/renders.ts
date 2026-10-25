/** Still renders of our own 3D scene (scripts/render-scene.mjs), light and dark. */
import boardDark800 from '../assets/renders/board-dark-800.webp'
import boardDark1600 from '../assets/renders/board-dark-1600.webp'
import boardLight800 from '../assets/renders/board-light-800.webp'
import boardLight1600 from '../assets/renders/board-light-1600.webp'

/** Intrinsic size of the 1600 px rendition (16:10), set on <img> so the layout never shifts. */
export const RENDER_W = 1600
export const RENDER_H = 1000

export const BOARD_RENDER = {
  alt: 'A still from our 3D scene: the breadboard circuit with its battery pack, the red probe on a row and the told row marked.',
  light: { src: boardLight1600, srcSet: `${boardLight800} 800w, ${boardLight1600} 1600w` },
  dark: { src: boardDark1600, srcSet: `${boardDark800} 800w, ${boardDark1600} 1600w` },
} as const
