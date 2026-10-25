import { Link } from 'react-router'

export function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-xl font-semibold">That page does not exist.</h1>
      <p className="mt-3 text-text-2">
        Try the <Link to="/">front page</Link> or <Link to="/sim">open the simulator</Link>.
      </p>
    </main>
  )
}
