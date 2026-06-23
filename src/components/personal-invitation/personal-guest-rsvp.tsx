import type { GuestRsvpStatus } from '@/modules/guests/guest.types';

const rsvpLabels: Record<GuestRsvpStatus, string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

type PersonalGuestRsvpProps = {
  guestToken: string;
  rsvpStatus: GuestRsvpStatus;
  slug: string;
};

/**
 * Plain POST form keeps the recipient flow anonymous. It sends only the current
 * capability route and requested attendance choice; never a guest/project ID.
 */
export function PersonalGuestRsvp({ guestToken, rsvpStatus, slug }: PersonalGuestRsvpProps) {
  return (
    <section
      aria-labelledby="personal-guest-rsvp-title"
      className="border-seraya-border-default bg-seraya-surface mx-auto my-10 max-w-xl rounded-[var(--seraya-radius-lg)] border px-5 py-7 text-center shadow-[0_10px_30px_rgb(74_45_48_/_0.07)] sm:px-8"
    >
      <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
        Konfirmasi kehadiran
      </p>
      <h2
        className="text-seraya-text-primary mt-3 font-serif text-3xl"
        id="personal-guest-rsvp-title"
      >
        Apakah Anda dapat hadir?
      </h2>
      <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
        Status saat ini:{' '}
        <span className="text-seraya-text-primary font-semibold">{rsvpLabels[rsvpStatus]}</span>
      </p>
      <form
        action={`/${slug}/g/${guestToken}/rsvp`}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
        method="post"
      >
        <button
          className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] px-5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
          name="status"
          type="submit"
          value="attending"
        >
          Hadir
        </button>
        <button
          className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-md)] border px-5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
          name="status"
          type="submit"
          value="declined"
        >
          Tidak hadir
        </button>
      </form>
    </section>
  );
}
