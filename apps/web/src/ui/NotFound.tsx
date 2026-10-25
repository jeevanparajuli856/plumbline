import { Link } from 'react-router'

export function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-20">
      <h1 tabIndex={-1} className="text-xl font-semibold">
        That page does not exist.
      </h1>
      <p className="mt-3 text-text-2">
        Try the{' '}
        <Link to="/" className="font-medium text-inferred underline underline-offset-4">
          front page
        </Link>{' '}
        or{' '}
        <Link to="/sim" className="font-medium text-inferred underline underline-offset-4">
          try the demo
        </Link>
        .
      </p>
    </main>
  )
}
