import type { PersonalGuestbookEntry } from '@/modules/guestbook';

type PersonalGuestbookProps = {
  entry: PersonalGuestbookEntry | null;
  feedback?: 'error' | 'success';
  guestToken: string;
  slug: string;
};

/**
 * Plain POST form intentionally carries no guest or project identity. The
 * capability is already present in the current private URL, matching RSVP.
 */
export function PersonalGuestbook({ entry, feedback, guestToken, slug }: PersonalGuestbookProps) {
  const hasEntry = Boolean(entry);

  return (
    <section
      aria-labelledby="personal-guestbook-title"
      className="border-seraya-border-default bg-seraya-surface mx-auto my-10 max-w-xl rounded-[var(--seraya-radius-lg)] border px-5 py-7 shadow-[0_10px_30px_rgb(74_45_48_/_0.07)] sm:px-8"
    >
      <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
        Ucapan &amp; Doa
      </p>
      <h2
        className="text-seraya-text-primary mt-3 font-serif text-3xl"
        id="personal-guestbook-title"
      >
        Kirim ucapan untuk mempelai
      </h2>
      <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
        Tulis ucapan dan doa terbaik untuk mempelai.
      </p>

      {feedback === 'success' ? (
        <p
          aria-live="polite"
          className="border-seraya-status-success/25 bg-seraya-status-success-soft text-seraya-text-primary mt-5 rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6"
          role="status"
        >
          {hasEntry ? 'Ucapan dan doa kalian sudah disimpan.' : 'Ucapan sudah diterima.'}
        </p>
      ) : null}
      {feedback === 'error' ? (
        <p
          aria-live="assertive"
          className="text-seraya-status-error mt-5 text-sm leading-6"
          role="alert"
        >
          Ucapan belum bisa dikirim. Periksa kembali isi pesan atau coba lagi beberapa saat lagi.
        </p>
      ) : null}

      <form action={`/${slug}/g/${guestToken}/guestbook`} className="mt-6 space-y-4" method="post">
        <label className="block" htmlFor="personal-guestbook-message">
          <span className="text-seraya-text-primary text-sm font-semibold">Ucapan &amp; doa</span>
          <textarea
            aria-describedby="personal-guestbook-help"
            className="border-seraya-border-default bg-seraya-canvas text-seraya-text-primary placeholder:text-seraya-text-muted focus-visible:outline-seraya-focus-ring mt-2 min-h-32 w-full rounded-[var(--seraya-radius-md)] border px-3 py-3 text-sm leading-6 focus-visible:outline-3 focus-visible:outline-offset-2"
            defaultValue={entry?.message ?? ''}
            id="personal-guestbook-message"
            maxLength={600}
            name="message"
            required
          />
        </label>
        <p className="text-seraya-text-muted text-sm leading-6" id="personal-guestbook-help">
          Maksimal 600 karakter. Ucapan dapat diperbarui selama tautan pribadi masih aktif.
        </p>
        <button
          className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] px-5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
          type="submit"
        >
          {hasEntry ? 'Perbarui ucapan' : 'Kirim ucapan'}
        </button>
      </form>
    </section>
  );
}
