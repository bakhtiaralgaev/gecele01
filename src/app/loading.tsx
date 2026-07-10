export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-kraft rounded-xl" />
            <div className="mt-3 h-4 bg-kraft rounded w-3/4" />
            <div className="mt-2 h-3 bg-kraft rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
