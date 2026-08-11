export function CandidateSkeleton() {
  return (
    <div
      aria-label="Carregando candidato"
      aria-live="polite"
      className="mt-4 overflow-hidden rounded-2xl border border-line bg-white/60 p-4"
    >
      <div className="flex gap-4">
        <div className="skeleton-shimmer h-28 w-24 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-3 py-1">
          <div className="skeleton-shimmer h-3 w-20 rounded-full" />
          <div className="skeleton-shimmer h-6 w-4/5 rounded-md" />
          <div className="skeleton-shimmer h-4 w-2/5 rounded-md" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="skeleton-shimmer h-14 rounded-xl" />
        <div className="skeleton-shimmer h-14 rounded-xl" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton-shimmer h-11 flex-1 rounded-xl" />
        <div className="skeleton-shimmer h-11 w-24 rounded-xl" />
      </div>
    </div>
  );
}
