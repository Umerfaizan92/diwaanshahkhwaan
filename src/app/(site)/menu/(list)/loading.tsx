export default function MenuLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the menu" className="mx-auto max-w-7xl px-4 pt-32 sm:px-6 lg:px-8">
      <div className="skeleton h-12 w-48" />
      <div className="skeleton mt-4 h-5 w-96 max-w-full" />
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton arch aspect-[3/2] w-full" />
            <div className="skeleton mt-4 h-5 w-3/4" />
            <div className="skeleton mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
