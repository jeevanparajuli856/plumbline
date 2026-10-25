import { useEffect, useState } from 'react'
import {
  drainPolite,
  POLITE_DRAIN_MS,
  readQueue,
  replaceQueue,
  subscribeLive,
  takeAssertive,
} from './liveQueue'

/** Two sinks, mounted once in App: a polite region and an assertive alert region. */
export function LiveRegion() {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')

  useEffect(() => {
    let timer: number | undefined
    const pump = () => {
      const assertiveTake = takeAssertive(readQueue())
      replaceQueue(assertiveTake.state)
      if (assertiveTake.next) {
        setAssertive('')
        window.requestAnimationFrame(() => setAssertive(assertiveTake.next?.text ?? ''))
      }
      if (timer === undefined) {
        const tick = () => {
          const take = drainPolite(readQueue())
          replaceQueue(take.state)
          if (take.next) {
            setPolite('')
            window.requestAnimationFrame(() => setPolite(take.next?.text ?? ''))
            timer = window.setTimeout(tick, POLITE_DRAIN_MS)
          } else {
            timer = undefined
          }
        }
        tick()
      }
    }
    const unsubscribe = subscribeLive(pump)
    pump()
    return () => {
      unsubscribe()
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <div id="live-polite" className="sr-only" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div id="live-assertive" className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  )
}
