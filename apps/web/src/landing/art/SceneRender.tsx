import { cx } from '../cx'
import { BOARD_RENDER, RENDER_H, RENDER_W } from './renders'
import a from './art.module.css'

interface SceneRenderProps {
  sizes: string
  /** Parallax depth for the motion module (UI_CONTRACT 5.3), 0.05 to 0.3. */
  depth?: number
  className?: string | undefined
}

/**
 * A still render of our own 3D scene (scripts/render-scene.mjs), light or dark to match the
 * theme. Both renditions are in the DOM; CSS shows one, and the hidden one is never fetched.
 */
export function SceneRender({ sizes, depth = 0.12, className }: SceneRenderProps) {
  return (
    <figure className={cx(a.render, className)} data-motion="parallax" data-motion-depth={depth}>
      {(['light', 'dark'] as const).map((scheme) => (
        <img
          key={scheme}
          className={scheme === 'light' ? a.renderLight : a.renderDark}
          src={BOARD_RENDER[scheme].src}
          srcSet={BOARD_RENDER[scheme].srcSet}
          sizes={sizes}
          alt={BOARD_RENDER.alt}
          width={RENDER_W}
          height={RENDER_H}
          loading="lazy"
          decoding="async"
        />
      ))}
    </figure>
  )
}
