import { describe, expect, it } from 'vitest';

import {
  createGuestEventCalendarFile,
  getRemoteAttendancePresentation,
  type GuestEventUtilityEvent,
} from '@/modules/invitation-templates/guest-event-utility-core';

const event: GuestEventUtilityEvent = {
  address: 'Jl. Contoh No. 1',
  arrivalNote: null,
  countdownEnabled: true,
  date: '2027-08-17',
  endTime: '10:00',
  id: '11111111-1111-4111-8111-111111111111',
  livestreamDescription: 'Saksikan momen akad kami dari mana pun Anda berada.',
  livestreamEnabled: true,
  livestreamHeading: 'Siaran Akad Nikah',
  livestreamPostEventMode: 'recording',
  livestreamPreEventMessage: 'Siaran akan dibuka menjelang akad dimulai.',
  livestreamUrl: 'https://youtu.be/AbCdEf12345',
  mapsHref: null,
  startTime: '08:00',
  title: 'Akad Nikah',
  venueName: 'Gedung Seraya',
};

const before = Date.parse('2027-08-16T23:00:00.000Z');
const during = Date.parse('2027-08-17T01:30:00.000Z');
const after = Date.parse('2027-08-17T04:00:00.000Z');

describe('V4I remote attendance lifecycle', () => {
  it('presents truthful before, scheduled-live, and recording states', () => {
    expect(getRemoteAttendancePresentation(event, before, 'Asia/Jakarta')).toMatchObject({
      actionLabel: 'Buka di YouTube',
      phase: 'before',
    });
    expect(getRemoteAttendancePresentation(event, during, 'Asia/Jakarta')).toMatchObject({
      actionLabel: 'Tonton siaran langsung',
      phase: 'live',
    });
    expect(getRemoteAttendancePresentation(event, after, 'Asia/Jakarta')).toMatchObject({
      actionLabel: 'Tonton rekaman acara',
      phase: 'recording',
    });
  });

  it('hides the post-event section when the owner chooses hide', () => {
    expect(
      getRemoteAttendancePresentation(
        { ...event, livestreamPostEventMode: 'hide' },
        after,
        'Asia/Jakarta',
      ),
    ).toEqual({ phase: 'hidden' });
  });

  it('does not expose invalid providers and includes the canonical YouTube URL in calendar files', () => {
    expect(
      getRemoteAttendancePresentation(
        { ...event, livestreamUrl: 'https://example.com/live/AbCdEf12345' },
        during,
        'Asia/Jakarta',
      ),
    ).toEqual({ phase: 'hidden' });

    const calendar = createGuestEventCalendarFile([event], 'Asia/Jakarta');
    expect(calendar).toContain('Siaran daring: https://www.youtube.com/watch?v=AbCdEf12345');
    expect(calendar).not.toContain('guestToken');
  });
});
