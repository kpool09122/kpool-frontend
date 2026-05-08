export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="min-h-screen bg-surface-base px-6 py-8 text-text-strong sm:px-10 lg:px-16"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded bg-stroke-subtle" />
          <div className="h-12 w-56 animate-pulse rounded bg-stroke-subtle" />
        </div>
        <div className="h-28 animate-pulse rounded-lg border border-stroke-subtle bg-surface-raised shadow-soft" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-lg border border-stroke-subtle bg-surface-raised shadow-soft"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
