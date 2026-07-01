export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-grid-storm-100" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="storm-surface h-28 animate-pulse rounded-xl bg-grid-surface" />
        ))}
      </div>
      <div className="storm-surface h-72 animate-pulse rounded-xl bg-grid-surface" />
    </div>
  );
}

