export default function GuestFollowUpLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat Tindak Lanjut"
      className="mx-auto max-w-7xl space-y-5 sm:space-y-7"
    >
      <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-7 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <div className="bg-seraya-soft h-3 w-24 animate-pulse rounded-full" />
        <div className="bg-seraya-soft mt-4 h-10 w-64 max-w-full animate-pulse rounded-[var(--seraya-radius-sm)]" />
        <div className="bg-seraya-soft mt-4 h-5 w-full max-w-2xl animate-pulse rounded-[var(--seraya-radius-sm)]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className="border-seraya-border-default bg-seraya-surface h-28 animate-pulse rounded-[var(--seraya-radius-md)] border"
            key={index}
          />
        ))}
      </div>
      <div className="border-seraya-border-default bg-seraya-surface h-96 animate-pulse rounded-[var(--seraya-radius-lg)] border" />
    </section>
  );
}
