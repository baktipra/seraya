'use client';

import { useState } from 'react';

import type { GuestRsvpStatus } from '@/modules/guests/guest.types';

const rsvpLabels: Record<GuestRsvpStatus, string> = {
  attending: 'Hadir',
  declined: 'Tidak hadir',
  pending: 'Belum merespons',
};

type PersonalGuestRsvpProps = {
  feedback?: 'success';
  guestToken: string;
  partySize: number;
  rsvpAttendeeCount: number | null;
  rsvpStatus: GuestRsvpStatus;
  slug: string;
};

/**
 * Anonymous capability form. It posts only a requested status and a candidate
 * attendance count; the server resolves the actual guest and party limit.
 */
export function PersonalGuestRsvp({
  feedback,
  guestToken,
  partySize,
  rsvpAttendeeCount,
  rsvpStatus,
  slug,
}: PersonalGuestRsvpProps) {
  const [selectedStatus, setSelectedStatus] = useState<'attending' | 'declined'>(
    rsvpStatus === 'declined' ? 'declined' : 'attending',
  );
  const attendeeCount = rsvpAttendeeCount ?? 1;
  const needsAttendanceCount = rsvpStatus === 'attending' && rsvpAttendeeCount === null;
  const attendeeOptions = Array.from({ length: partySize }, (_, index) => index + 1);

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
        Konfirmasi Kehadiran
      </h2>
      <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
        Apakah Anda dapat hadir? Status saat ini:{' '}
        <span className="text-seraya-text-primary font-semibold">{rsvpLabels[rsvpStatus]}</span>
      </p>
      <p className="text-seraya-text-muted mt-2 text-sm leading-6">
        Undangan ini berlaku untuk maksimal {partySize} orang.
      </p>
      {needsAttendanceCount ? (
        <p className="text-seraya-text-secondary mt-2 text-sm leading-6" role="status">
          Kehadiran sudah tercatat, tetapi jumlah orang yang hadir masih perlu dikonfirmasi.
        </p>
      ) : null}
      {feedback === 'success' ? (
        <p
          aria-live="polite"
          className="border-seraya-status-success/25 bg-seraya-status-success-soft text-seraya-text-primary mt-4 rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6"
          role="status"
        >
          Konfirmasi kehadiran kalian sudah disimpan.
        </p>
      ) : null}

      <form action={`/${slug}/g/${guestToken}/rsvp`} className="mt-6 space-y-5" method="post">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Pilih status kehadiran</legend>
          <label
            className={`focus-within:outline-seraya-focus-ring flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-within:outline-3 focus-within:outline-offset-2 ${
              selectedStatus === 'attending'
                ? 'border-seraya-action-primary bg-seraya-brand-soft text-seraya-text-primary'
                : 'border-seraya-border-default bg-seraya-surface text-seraya-text-secondary hover:border-seraya-border-strong'
            }`}
          >
            <input
              checked={selectedStatus === 'attending'}
              className="sr-only"
              name="status"
              onChange={() => setSelectedStatus('attending')}
              type="radio"
              value="attending"
            />
            Hadir
          </label>
          <label
            className={`focus-within:outline-seraya-focus-ring flex min-h-12 cursor-pointer items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold transition-colors focus-within:outline-3 focus-within:outline-offset-2 ${
              selectedStatus === 'declined'
                ? 'border-seraya-action-primary bg-seraya-brand-soft text-seraya-text-primary'
                : 'border-seraya-border-default bg-seraya-surface text-seraya-text-secondary hover:border-seraya-border-strong'
            }`}
          >
            <input
              checked={selectedStatus === 'declined'}
              className="sr-only"
              name="status"
              onChange={() => setSelectedStatus('declined')}
              type="radio"
              value="declined"
            />
            Tidak hadir
          </label>
        </fieldset>

        {selectedStatus === 'attending' ? (
          partySize === 1 ? (
            <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border px-4 py-3 text-left">
              <input name="attendeeCount" type="hidden" value="1" />
              <p className="text-seraya-text-primary text-sm font-semibold">1 orang hadir</p>
              <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                Undangan ini berlaku untuk satu orang.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-left">
              <label
                className="text-seraya-text-primary text-sm font-semibold"
                htmlFor="personal-rsvp-attendee-count"
              >
                Jumlah orang yang hadir
              </label>
              <select
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                defaultValue={String(Math.min(attendeeCount, partySize))}
                id="personal-rsvp-attendee-count"
                name="attendeeCount"
              >
                {attendeeOptions.map((count) => (
                  <option key={count} value={count}>
                    {count} orang
                  </option>
                ))}
              </select>
              <p className="text-seraya-text-muted text-sm leading-6">
                Pilih jumlah orang yang akan hadir dari rombongan kalian.
              </p>
            </div>
          )
        ) : null}

        <button
          className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] px-5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
          type="submit"
        >
          Simpan konfirmasi
        </button>
      </form>
    </section>
  );
}
