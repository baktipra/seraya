import type { PersonalGuestbookEntry } from '@/modules/guestbook';

type PersonalGuestbookProps = {
  entry: PersonalGuestbookEntry | null;
  feedback?: 'error' | 'success';
  guestToken: string;
  slug: string;
};

/**
 * Behavior-first capability form. The personal route supplies authorized data;
 * selected invitation templates own wrapper, rhythm, and visual presentation.
 */
export function PersonalGuestbook({ entry, feedback, guestToken, slug }: PersonalGuestbookProps) {
  const hasEntry = Boolean(entry);

  return (
    <section aria-labelledby="personal-guestbook-title" data-personal-guestbook>
      <p data-personal-response-eyebrow>Ucapan &amp; Doa</p>
      <h2 data-personal-response-title id="personal-guestbook-title">
        Kirim ucapan untuk mempelai
      </h2>
      <p data-personal-response-copy>Tulis ucapan dan doa terbaik untuk mempelai.</p>

      {feedback === 'success' ? (
        <p aria-live="polite" data-personal-response-success role="status">
          {hasEntry ? 'Ucapan dan doa kalian sudah disimpan.' : 'Ucapan sudah diterima.'}
        </p>
      ) : null}
      {feedback === 'error' ? (
        <p aria-live="assertive" data-personal-response-error role="alert">
          Ucapan belum bisa dikirim. Periksa kembali isi pesan atau coba lagi beberapa saat lagi.
        </p>
      ) : null}

      <form action={`/${slug}/g/${guestToken}/guestbook`} data-personal-response-form method="post">
        <label data-personal-guestbook-field htmlFor="personal-guestbook-message">
          <span>Ucapan &amp; doa</span>
          <textarea
            aria-describedby="personal-guestbook-help"
            defaultValue={entry?.message ?? ''}
            id="personal-guestbook-message"
            maxLength={600}
            name="message"
            required
          />
        </label>
        <p data-personal-guestbook-help id="personal-guestbook-help">
          Maksimal 600 karakter. Ucapan dapat diperbarui selama tautan pribadi masih aktif.
        </p>
        <button data-personal-response-submit type="submit">
          {hasEntry ? 'Perbarui ucapan' : 'Kirim ucapan'}
        </button>
      </form>
    </section>
  );
}
