import s from './landing.module.css'

/**
 * The plumb line pinned at the right page edge (UI_CONTRACT 5.3, `data-motion="plumb"`). Static DOM
 * is the line hanging at rest; the motion module slides the bob with scroll and sets the swing.
 * Decorative: its text twin is the caption in the mast.
 */
export function EdgePlumb() {
  return (
    <div className={s.edgePlumb} aria-hidden="true" data-motion="plumb">
      <span className={s.edgeString} data-motion-string />
      <span className={s.edgeBob} data-motion-bob />
    </div>
  )
}
