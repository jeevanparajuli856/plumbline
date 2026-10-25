import { Link } from 'react-router'

const FOOTER_LINK =
  'font-medium text-text underline decoration-hairline underline-offset-4 hover:decoration-text'

/** The product line and where to reach us. No names, no university (ADR-0014). */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-bench">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-baseline justify-between gap-x-6 gap-y-4 px-4 py-10 sm:px-8 lg:px-16">
        <p>
          <span className="font-display font-semibold">Truehand.</span>{' '}
          <span className="text-text-2">Not a safety device.</span>
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <Link to="/docs" className={FOOTER_LINK}>
              Docs
            </Link>
          </li>
          <li>
            <Link to="/docs#privacy" className={FOOTER_LINK}>
              Privacy
            </Link>
          </li>
          <li>
            <Link to="/contact" className={FOOTER_LINK}>
              Contact
            </Link>
          </li>
          <li>
            <Link to="/about" className={FOOTER_LINK}>
              About
            </Link>
          </li>
          <li>
            <a href="mailto:support@truehand.tech" className={FOOTER_LINK}>
              support@truehand.tech
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
