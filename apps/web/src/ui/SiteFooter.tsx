/** Team and university live here only (POSITIONING: the competition is never named). */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-text bg-bench">
      <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-10 sm:px-8 md:grid-cols-12 lg:px-16">
        <p className="md:col-span-5">
          <span className="font-semibold">Plumbline.</span>{' '}
          <span className="text-text-2">Research preview. Not a safety device.</span>
        </p>
        <p className="text-text-2 md:col-span-7 md:text-right">
          Jeevan Parajuli and Pankaj Bhatta, University of Louisiana Monroe.
        </p>
      </div>
    </footer>
  )
}
