import e from './edge.module.css'

/** Holes in the edge column, top to bottom. */
export const EDGE_HOLE_COUNT = 24

/**
 * The edge cell column (UI_CONTRACT 5.3, ADR-0013): identical hollow holes down the right page edge
 * and one ringed dot in --brand, the hole the probe found. Static DOM rests the dot on the first
 * hole; the motion module slides it with scroll. Hook names stay "plumb" from the earlier motif.
 * Decorative: its text twin is the caption in the mast.
 */
export function EdgeColumn() {
  return (
    <div className={e.edgePlumb} aria-hidden="true" data-motion="plumb">
      <span className={e.edgeString} data-motion-string>
        {Array.from({ length: EDGE_HOLE_COUNT }, (_, i) => (
          <span key={i} className={e.edgeHole} />
        ))}
      </span>
      <span className={e.edgeBob} data-motion-bob />
    </div>
  )
}
