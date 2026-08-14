import type {
  PersonalGuestbookEntry,
  PersonalGuestbookSharedWish,
} from '@/modules/guestbook';

type PersonalGuestbookProps = {
  entry: PersonalGuestbookEntry | null;
  feedback?: 'error' | 'success';
  guestToken: string;
  sharedWishes: PersonalGuestbookSharedWish[];
  slug: string;
};

function formatWishDate(value: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '';
  }
}

/**
 * Personal-only guestbook capability. Consent is explicit and shared wishes are
 * already filtered by the database for project, consent, and owner moderation.
 */
export function PersonalGuestbook({
  entry,
  feedback,
  guestToken,
  sharedWishes,
  slug,
}: PersonalGuestbookProps) {
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
          Ucapan dan preferensi berbagi sudah disimpan.
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
        <label className="flex items-start gap-3 text-sm leading-6" data-personal-guestbook-consent>
          <input
            className="mt-1 h-4 w-4 shrink-0"
            defaultChecked={entry?.shareWithGuests ?? false}
            name="shareWithGuests"
            type="checkbox"
          />
          <span>
            Izinkan ucapan ini tampil kepada tamu lain di undangan pribadi. Anda dapat mengubah pilihan ini kapan saja.
          </span>
        </label>
        <button data-personal-response-submit type="submit">
          {hasEntry ? 'Perbarui ucapan' : 'Kirim ucapan'}
        </button>
      </form>

      <section aria-labelledby="personal-shared-wishes-title" className="mt-8" data-personal-shared-wishes>
        <p data-personal-response-eyebrow>Ucapan dari tamu</p>
        <h3 className="text-xl font-semibold" id="personal-shared-wishes-title">
          Doa baik untuk hari bahagia
        </h3>
        {sharedWishes.length === 0 ? (
          <p className="mt-3 text-sm leading-6" data-personal-response-copy>
            Belum ada ucapan yang dibagikan untuk tamu lain.
          </p>
        ) : (
          <ul className="mt-5 space-y-4" data-personal-shared-wishes-list>
            {sharedWishes.map((wish, index) => (
              <li className="border-t border-current/15 pt-4" key={`${wish.createdAt}-${index}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{wish.displayName}</p>
                  <time className="text-xs opacity-70" dateTime={wish.createdAt}>
                    {formatWishDate(wish.createdAt)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-7 whitespace-pre-wrap">{wish.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
