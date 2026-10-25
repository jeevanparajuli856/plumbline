/**
 * Stand-in for `requestViewReset` from '@/scene/viewControl', which arrives with the scene lane
 * (merged after web-shell). TODO(Sprint 1 integration, scene merge): delete this file and import
 * `requestViewReset` from '@/scene/viewControl' in SimPage.tsx; that module imports nothing from three.
 */
export function requestViewReset(): void {
  /* no scene on this branch yet */
}
