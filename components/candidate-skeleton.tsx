export function CandidateSkeleton({ legenda = false }: { legenda?: boolean }) {
  return (
    <div
      aria-label={legenda ? "Carregando partido" : "Carregando candidato"}
      aria-live="polite"
      className="flex items-start justify-between gap-4 rounded-lg border border-screen-line bg-white p-4"
    >
      <div className="flex flex-1 flex-col gap-3">
        <div className="skeleton-shimmer h-8 w-28 rounded-md" />
        <div className="skeleton-shimmer h-5 w-4/5 rounded-md" />
        <div className="skeleton-shimmer h-4 w-2/5 rounded-md" />
      </div>
      {legenda ? null : (
        <div className="skeleton-shimmer h-32 w-24 shrink-0 rounded-md" />
      )}
    </div>
  );
}
