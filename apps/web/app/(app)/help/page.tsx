export default function HelpPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Help</h1>

      <section className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
        <h2 className="mb-2 text-sm font-medium text-base-content/80">Getting started</h2>
        <p className="text-sm text-base-content/60">
          CardScan is in active development. Scanning, the card database, collection tracking,
          and pricing are being rolled out in stages — the dashboard reflects what&apos;s
          available today.
        </p>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
        <h2 className="mb-2 text-sm font-medium text-base-content/80">Need help?</h2>
        <p className="text-sm text-base-content/60">
          Reach out at{" "}
          <a href="mailto:support@cardscan.app" className="link link-primary">
            support@cardscan.app
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-base-content/40">
        Pokémon and Magic: The Gathering are trademarks of their respective owners. CardScan is
        not affiliated with or endorsed by these companies.
      </p>
    </div>
  );
}
