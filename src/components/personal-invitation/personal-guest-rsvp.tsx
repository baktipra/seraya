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
 * Behavior-first anonymous capability form. The selected invitation template
 * owns all visual surfaces through stable semantic data attributes.
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
    <section aria-labelledby="personal-guest-rsvp-title" data-personal-guest-rsvp>
      <p data-personal-response-eyebrow>Konfirmasi kehadiran</p>
      <h2 data-personal-response-title id="personal-guest-rsvp-title">
        Konfirmasi Kehadiran
      </h2>
      <p data-personal-response-copy>
        Apakah Anda dapat hadir? Status saat ini:{' '}
        <span data-personal-response-status>{rsvpLabels[rsvpStatus]}</span>
      </p>
      <p data-personal-response-copy>Undangan ini berlaku untuk maksimal {partySize} orang.</p>
      {needsAttendanceCount ? (
        <p data-personal-response-notice role="status">
          Kehadiran sudah tercatat, tetapi jumlah orang yang hadir masih perlu dikonfirmasi.
        </p>
      ) : null}
      {feedback === 'success' ? (
        <p aria-live="polite" data-personal-response-success role="status">
          Konfirmasi kehadiran kalian sudah disimpan.
        </p>
      ) : null}

      <form action={`/${slug}/g/${guestToken}/rsvp`} data-personal-response-form method="post">
        <fieldset data-personal-rsvp-choices>
          <legend className="sr-only">Pilih status kehadiran</legend>
          <label data-personal-rsvp-choice data-selected={selectedStatus === 'attending'}>
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
          <label data-personal-rsvp-choice data-selected={selectedStatus === 'declined'}>
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
            <div data-personal-rsvp-attendance>
              <input name="attendeeCount" type="hidden" value="1" />
              <p data-personal-rsvp-attendance-title>1 orang hadir</p>
              <p data-personal-rsvp-attendance-copy>Undangan ini berlaku untuk satu orang.</p>
            </div>
          ) : (
            <div data-personal-rsvp-attendance>
              <label data-personal-rsvp-attendance-label htmlFor="personal-rsvp-attendee-count">
                Jumlah orang yang hadir
              </label>
              <select
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
              <p data-personal-rsvp-attendance-copy>
                Pilih jumlah orang yang akan hadir dari rombongan kalian.
              </p>
            </div>
          )
        ) : null}

        <button data-personal-response-submit type="submit">
          Simpan konfirmasi
        </button>
      </form>
    </section>
  );
}
