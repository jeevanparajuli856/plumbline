/** Shown when WebGL is missing or the context is lost. Nothing informational lives only in 3D. */
export function SceneUnavailable() {
  return (
    <p className="m-0 p-4 text-sm text-muted font-mono">
      3D view unavailable here. The text channel has everything.
    </p>
  )
}
