/// Esqueleto de carga mientras el servidor arma la página.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="aspect-4/3 animate-pulse bg-slate-200" />
            <div className="space-y-2 p-3">
              <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
