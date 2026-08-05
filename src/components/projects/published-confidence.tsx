import { Badge } from '@/design-system';

export function PublishedConfidence({ hasUnpublishedChanges }: { hasUnpublishedChanges: boolean }) {
  const isSynchronized = !hasUnpublishedChanges;

  return (
    <section
      aria-labelledby="published-confidence-title"
      className="border-seraya-border-subtle bg-seraya-status-success-soft min-w-0 rounded-[var(--seraya-radius-xl)] border p-5 sm:p-6"
      data-published-confidence-state={isSynchronized ? 'synchronized' : 'published-version-active'}
      data-rc1-published-confidence="slice-a"
    >
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.9fr)] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <p className="text-seraya-status-success text-xs font-semibold">
            Setelah undangan terbit
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2.5">
            <h2 className="seraya-heading-md" id="published-confidence-title">
              {isSynchronized ? 'Versi tamu sinkron' : 'Versi terbit tetap aktif'}
            </h2>
            <Badge variant={isSynchronized ? 'success' : 'warning'}>
              {isSynchronized ? 'Sinkron' : 'Menunggu terbit ulang'}
            </Badge>
          </div>
          <p className="text-seraya-text-secondary mt-2 max-w-2xl text-sm leading-6">
            {isSynchronized
              ? 'Isi yang dibuka tamu sama dengan versi undangan yang terakhir diterbitkan.'
              : 'Perubahan terbaru masih tersimpan sebagai draf. Tamu tetap melihat versi terbit sebelumnya sampai Anda menerbitkan ulang.'}
          </p>
        </div>

        <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-lg)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-medium">Status undangan</dt>
            <dd className="mt-1.5 min-w-0">
              <strong className="text-seraya-text-primary block text-base font-semibold">
                Terbit
              </strong>
              <span className="text-seraya-text-secondary mt-1 block text-sm leading-6">
                Undangan publik tetap aktif.
              </span>
            </dd>
          </div>
          <div className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-lg)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-medium">Tautan personal</dt>
            <dd className="mt-1.5 min-w-0">
              <strong className="text-seraya-text-primary block text-base font-semibold">
                Tetap berlaku
              </strong>
              <span className="text-seraya-text-secondary mt-1 block text-sm leading-6">
                Tautan personal yang masih aktif tidak berubah saat isi diterbitkan ulang.
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <p
        className="border-seraya-border-subtle text-seraya-text-secondary mt-5 border-t pt-4 text-sm leading-6"
        data-rc1-post-publish-handoff
      >
        Terbitkan ulang untuk memperbarui isi yang dilihat tamu. Setelah itu, lanjutkan satu fokus
        operasional di bawah.
      </p>
    </section>
  );
}
