/**
 * Stock photography for the landing (Unsplash License: free for commercial use, no attribution
 * required; we credit anyway). Sources and licence notes: docs/IMAGE_CREDITS.md.
 * Honesty rule: these are stock photos. They never stand in for our users, our study or our
 * hardware, so every caption says "Stock photo" and alt text describes only what is visible.
 */
import brailleDisplay800 from './assets/photos/braille-display-hands-800.webp'
import brailleDisplay1600 from './assets/photos/braille-display-hands-1600.webp'
import brailleRows800 from './assets/photos/braille-rows-800.webp'
import brailleRows1600 from './assets/photos/braille-rows-1600.webp'
import breadboardEmpty800 from './assets/photos/breadboard-empty-800.webp'
import breadboardEmpty1600 from './assets/photos/breadboard-empty-1600.webp'
import breadboardWired800 from './assets/photos/breadboard-wired-800.webp'
import breadboardWired1600 from './assets/photos/breadboard-wired-1600.webp'
import multimeter800 from './assets/photos/multimeter-probes-800.webp'
import multimeter1600 from './assets/photos/multimeter-probes-1600.webp'

export interface Photo {
  id: string
  src: string
  srcSet: string
  /** Intrinsic size of the 1600 px rendition; set on <img> so the layout never shifts. */
  width: number
  height: number
  alt: string
  credit: string
  sourceUrl: string
}

function photo(p: Omit<Photo, 'srcSet' | 'src'> & { small: string; large: string }): Photo {
  const { small, large, ...rest } = p
  return { ...rest, src: large, srcSet: `${small} 800w, ${large} 1600w` }
}

export const PHOTOS = {
  brailleDisplay: photo({
    id: 'braille-display',
    small: brailleDisplay800,
    large: brailleDisplay1600,
    width: 1600,
    height: 1200,
    alt: 'Two hands on a computer: one on the keyboard, the other reading a refreshable braille display.',
    credit: 'Stock photo: Compagnons on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/4MoIpDcSlr4',
  }),
  multimeter: photo({
    id: 'multimeter',
    small: multimeter800,
    large: multimeter1600,
    width: 1600,
    height: 1185,
    alt: 'A handheld digital multimeter with its red and black test probes lying beside it.',
    credit: 'Stock photo: Nekhil R on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/g8Pr-LbVbjU',
  }),
  breadboardWired: photo({
    id: 'breadboard-wired',
    small: breadboardWired800,
    large: breadboardWired1600,
    width: 1600,
    height: 1202,
    alt: 'A small breadboard crowded with jumper wires, connected to a microcontroller board.',
    credit: 'Stock photo: Vishnu Mohanan on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/vtg8tAdoWVQ',
  }),
  brailleRows: photo({
    id: 'braille-rows',
    small: brailleRows800,
    large: brailleRows1600,
    width: 1600,
    height: 1067,
    alt: 'A grey panel of raised braille dots laid out in numbered rows.',
    credit: 'Stock photo: Marcus Lenk on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/ypChyZRAR_U',
  }),
  breadboardEmpty: photo({
    id: 'breadboard-empty',
    small: breadboardEmpty800,
    large: breadboardEmpty1600,
    width: 1600,
    height: 2132,
    alt: 'An empty white breadboard mounted beside a microcontroller board on a dark cloth.',
    credit: 'Stock photo: Vishnu Mohanan on Unsplash',
    sourceUrl: 'https://unsplash.com/photos/AcTlEUJJEIg',
  }),
} as const satisfies Record<string, Photo>
