import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

import { buildGuestFollowUpHandoff, buildGuestFollowUpHandoffMessage } from '../follow-up-handoff';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function snapshot() {
  const draft = createDefaultInvitationDraftContent(project);
  draft.eventSchedule.events = [
    {
      ...draft.eventSchedule.events[0]!,
      date: '2027-08-17',
      endTime: '10:00',
      startTime: '09:00',
      title: 'Akad Nikah',
      venueAddress: 'Jl. Melati 10, Jakarta',
      venueName: 'Gedung Seraya',
    },
    {
      ...draft.eventSchedule.events[0]!,
      date: '2027-08-17',
      endTime: null,
      id: '22222222-2222-4222-8222-222222222222',
      startTime: '11:00',
      title: 'Resepsi',
      venueAddress: null,
      venueName: 'Grand Ballroom',
    },
  ];

  return {
    draft,
    project: {
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      slug: 'raka-nadia',
      timezone: 'Asia/Jakarta',
    },
  };
}

const personalUrl = 'https://seraya.example/raka-nadia/g/opaque-token';

describe('Guest Follow-up Slice C deterministic manual handoff messages', () => {
  it('preserves the existing initial invitation copy', () => {
    expect(
      buildGuestFollowUpHandoffMessage({
        guestDisplayName: '  Keluarga   Budi ',
        messageKind: 'initial_invitation',
        personalUrl,
        snapshot: snapshot(),
      }),
    ).toBe(
      [
        'Halo Keluarga Budi,',
        '',
        'Kami mengundang Anda untuk hadir di acara pernikahan kami.',
        '',
        personalUrl,
      ].join('\n'),
    );
  });

  it('builds a direct RSVP reminder without claiming send or delivery', () => {
    const message = buildGuestFollowUpHandoffMessage({
      guestDisplayName: 'Rani',
      messageKind: 'rsvp_reminder',
      personalUrl,
      snapshot: snapshot(),
    });

    expect(message).toBe(
      [
        'Halo Rani,',
        '',
        'Kami ingin mengingatkan Anda untuk mengonfirmasi kehadiran melalui Undangan Pribadi berikut:',
        '',
        personalUrl,
        '',
        'Terima kasih.',
      ].join('\n'),
    );
    expect(message).not.toMatch(/sudah dikirim|terkirim|diterima|dibaca/iu);
  });

  it('uses the immutable published schedule for an attending event reminder', () => {
    const result = buildGuestFollowUpHandoff({
      guestDisplayName: 'Budi',
      messageKind: 'event_reminder',
      personalUrl,
      preparedAt: '2027-08-15T03:00:00.000Z',
      recipientWhatsAppPhoneE164: '+6281234567890',
      snapshot: snapshot(),
    });
    const parsed = new URL(result.whatsappComposeUrl);

    expect(result.messageText).toContain(
      'Pengingat untuk rangkaian acara pernikahan Raka & Nadia:',
    );
    expect(result.messageText).toContain('1. Akad Nikah');
    expect(result.messageText).toContain('17 Agustus 2027, pukul 09.00–10.00');
    expect(result.messageText).toContain('Gedung Seraya');
    expect(result.messageText).toContain('2. Resepsi');
    expect(result.messageText).toContain('pukul 11.00');
    expect(result.messageText).toContain(personalUrl);
    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://wa.me/6281234567890');
    expect(parsed.searchParams.get('text')).toBe(result.messageText);
    expect(result.preparedAt).toBe('2027-08-15T03:00:00.000Z');
  });

  it('rejects malformed capability URLs and never adds operational identifiers', () => {
    expect(() =>
      buildGuestFollowUpHandoff({
        guestDisplayName: 'Budi',
        messageKind: 'initial_invitation',
        personalUrl: 'javascript:alert(1)',
        preparedAt: '2027-08-15T03:00:00.000Z',
        recipientWhatsAppPhoneE164: '+6281234567890',
        snapshot: snapshot(),
      }),
    ).toThrow('Personal guest invitation URL must be a valid HTTPS URL.');

    const result = buildGuestFollowUpHandoff({
      guestDisplayName: 'Budi',
      messageKind: 'initial_invitation',
      personalUrl,
      preparedAt: '2027-08-15T03:00:00.000Z',
      recipientWhatsAppPhoneE164: '+6281234567890',
      snapshot: snapshot(),
    });
    expect(result.messageText).not.toMatch(/projectId|guestId|token_hash|created_by/iu);
  });
});
