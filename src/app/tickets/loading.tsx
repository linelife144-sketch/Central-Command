export default function TicketsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-44 animate-pulse rounded-lg bg-grid-storm-100" />
      <div className="storm-surface h-20 animate-pulse rounded-xl bg-grid-surface" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="storm-surface h-24 animate-pulse rounded-xl bg-grid-surface" />
        ))}
      </div>
    </div>
  );
}

