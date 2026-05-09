import { PLATFORMS } from '@rtaip/shared';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          rtaip social — phase 0
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Brand once. Post everywhere.
        </h1>
        <p className="text-muted-foreground">
          Scaffolding online. Brand Skill UI lands in Phase 1.
        </p>
      </div>

      <section className="mt-12 space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium">Phase 0 health check</h2>
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            GET /api/health
          </code>{' '}
          must return <code>{`{ ok: true, db: true, queue: true }`}</code> before
          any feature work begins.
        </p>
        <a
          href="/api/health"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Run health check
        </a>
      </section>

      <section className="mt-8 space-y-3 rounded-lg border p-6">
        <h2 className="text-sm font-medium">Platforms wired</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
          {PLATFORMS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
