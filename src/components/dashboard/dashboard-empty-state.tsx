import { Button } from '@/design-system';

const collections = [
  { className: 'border-[#d8b7b5] bg-[#f8ecea] text-[#8e4b52]', name: 'Roselle' },
  { className: 'border-[#b8b4aa] bg-[#eceae2] text-[#59615d]', name: 'Aruna' },
  { className: 'border-[#6f6558] bg-[#292730] text-[#d7b982]', name: 'Laras' },
] as const;

export function DashboardEmptyState() {
  return (
    <section
      aria-labelledby="empty-dashboard-title"
      className="border-seraya-border-default bg-seraya-surface grid overflow-hidden border lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]"
    >
      <div className="px-6 py-9 sm:px-9 sm:py-12 lg:px-12 lg:py-14">
        <p className="seraya-eyebrow text-seraya-action-primary">Undangan pertama kalian</p>
        <h2
          id="empty-dashboard-title"
          className="text-seraya-text-primary mt-4 max-w-xl font-serif text-[clamp(2.7rem,5vw,4.6rem)] leading-[0.9] font-medium tracking-[-0.045em]"
        >
          Mulai dari pengalaman yang terasa paling dekat.
        </h2>
        <p className="text-seraya-text-secondary mt-5 max-w-xl text-base leading-7">
          Isi identitas awal, pilih Roselle, Aruna, atau Laras, lalu Seraya menyiapkan draf pribadi
          yang dapat kalian lanjutkan bertahap.
        </p>
        <form action="/dashboard/new" className="mt-8" method="get">
          <Button size="lg" type="submit">
            Mulai buat undangan <span aria-hidden="true">→</span>
          </Button>
        </form>
      </div>

      <div className="bg-seraya-brand-soft relative isolate grid min-h-[22rem] place-items-center overflow-hidden px-6 py-10 sm:px-10">
        <div
          aria-hidden="true"
          className="border-seraya-action-primary/18 absolute -top-20 -right-16 -z-10 size-64 rounded-full border"
        />
        <div className="flex items-end justify-center gap-3 sm:gap-4">
          {collections.map((collection, index) => (
            <div
              className={`${collection.className} flex aspect-[4/5] w-[5.25rem] rotate-[-4deg] items-center justify-center rounded-[1rem] border font-serif text-lg shadow-[0_18px_38px_rgb(59_41_35_/_0.12)] sm:w-[6.5rem] ${
                index === 1
                  ? 'relative z-10 -translate-y-5 rotate-0'
                  : index === 2
                    ? 'rotate-[4deg]'
                    : ''
              }`}
              key={collection.name}
            >
              {collection.name}
            </div>
          ))}
        </div>
        <p className="text-seraya-text-muted mt-7 text-center text-xs leading-5">
          Tiga karakter. Satu perjalanan tamu yang tetap lengkap.
        </p>
      </div>
    </section>
  );
}
