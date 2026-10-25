import { gsap, ScrollTrigger } from '../scroll'
import {
  DEVICE_FLOAT_DURATION_S,
  DEVICE_FLOAT_ROTATE_X_DEG,
  DEVICE_FLOAT_ROTATE_Y_DEG,
  DEVICE_FLOAT_Y_PX,
  DEVICE_PERSPECTIVE_PX,
  DEVICE_TILT_EASE_S,
  FINE_POINTER,
} from '../constants'
import { arrivedLate, deviceTilt, type PointerOffset } from '../helpers'
import { keepStyles } from './styles'
import type { Cleanup } from './types'

/** Where the pointer sits relative to the device centre, each axis scaled to half the viewport. */
function pointerOffset(el: Element, event: MouseEvent): PointerOffset {
  const rect = el.getBoundingClientRect()
  return {
    x: (event.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2),
    y: (event.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2),
  }
}

/** Steers the tilt with a fine pointer; returns the listener cleanup. */
function followPointer(el: Element, onMove: (offset: PointerOffset | null) => void): Cleanup {
  if (!window.matchMedia(FINE_POINTER).matches) return () => {}
  const move = (event: MouseEvent) => onMove(pointerOffset(el, event))
  const leave = () => onMove(null)
  window.addEventListener('pointermove', move, { passive: true })
  document.documentElement.addEventListener('pointerleave', leave)
  return () => {
    window.removeEventListener('pointermove', move)
    document.documentElement.removeEventListener('pointerleave', leave)
  }
}

/**
 * One phone wrapper: floats in on load, then tilts with its section's scroll position and, on fine
 * pointers, toward the pointer. Only the wrapper is transformed, so the screen never moves
 * against the device. Perspective goes on the parent and is reverted with everything else.
 */
function device(el: HTMLElement): Cleanup {
  const parent = el.parentElement
  const restore = keepStyles(parent ? [el, parent] : [el])
  if (parent) gsap.set(parent, { perspective: DEVICE_PERSPECTIVE_PX })

  let isSettled = arrivedLate()
  let sectionProgress = 0
  let pointer: PointerOffset | null = null
  // The intro comes first so the tilt chasers below always write after it.
  if (!isSettled) {
    gsap.from(el, {
      y: DEVICE_FLOAT_Y_PX,
      rotationX: DEVICE_FLOAT_ROTATE_X_DEG,
      rotationY: DEVICE_FLOAT_ROTATE_Y_DEG,
      opacity: 0,
      duration: DEVICE_FLOAT_DURATION_S,
      ease: 'power3.out',
      onComplete: () => {
        isSettled = true
        tilt()
      },
    })
  }
  const tiltX = gsap.quickTo(el, 'rotationX', { duration: DEVICE_TILT_EASE_S, ease: 'power2.out' })
  const tiltY = gsap.quickTo(el, 'rotationY', { duration: DEVICE_TILT_EASE_S, ease: 'power2.out' })
  function tilt(): void {
    if (!isSettled) return
    const next = deviceTilt(sectionProgress, pointer)
    tiltX(next.rotationX)
    tiltY(next.rotationY)
  }

  const trigger = ScrollTrigger.create({
    trigger: el.closest('section') ?? el,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      sectionProgress = self.progress
      tilt()
    },
  })
  sectionProgress = trigger.progress
  tilt()
  const unfollow = followPointer(el, (offset) => {
    pointer = offset
    tilt()
  })
  return () => {
    unfollow()
    restore()
  }
}

export function devices(root: HTMLElement): Cleanup {
  const cleanups = Array.from(root.querySelectorAll<HTMLElement>('[data-motion="device"]')).map(
    device,
  )
  return () => cleanups.forEach((cleanup) => cleanup())
}
