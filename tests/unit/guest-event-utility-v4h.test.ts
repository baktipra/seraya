import { describe, expect, it } from 'vitest';

import {
  createGuestEventCalendarFile,
  getGoogleCalendarHref,
  getGuestEventCountdownState,
  getGuestEventRouteHref,
  getYoutubeEmbedHref,
  parseYoutubeVideoId,
  type GuestEventUtilityEvent,
} from '@/modules/invitation-templates/guest-event-utility-core';

const event: GuestEventUtilityEvent = {
  address: 'Jalan Seraya 17, Jakarta',
  arrivalNote: 'Masuk melalui gerbang selatan.',
  countdownEnabled: true,
  date: '2027-08-17',
  endTime: '10:00',
  id: '11111111-1111-4111-8111-111111111111',
  latitude: -6.2,
  livestreamEnabled: true,
  livestreamHeading: 'Siaran Akad Nikah',
  livestreamUrl: 'https://www.youtube.com/live/AbCdEf12345',
  locationSource: 'google_place',
  longitude: 106.816666,
  mapsHref: 'https://maps.google.com/?q=Gedung+Seraya',
  placeId: 'seraya-place-id',
  startTime: '08:00',
  title: 'Akad Nikah',
  venueName: 'Gedung Seraya',
};

describe('V4H guest event utility', () => {
  it('normalizes supported YouTube URL shapes without accepting unrelated hosts', () => {
    expect(parseYoutubeVideoId('https://youtu.be/AbCdEf12345')).toBe('AbCdEf12345');
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=AbCdEf12345')).toBe('AbCdEf12345');
    expect(parseYoutubeVideoId('https://www.youtube.com/live/AbCdEf12345')).toBe('AbCdEf12345');
    expect(getYoutubeEmbedHref(event.livestreamUrl)).toBe(
      'https://www.youtube-nocookie.com/embed/AbCdEf12345?rel=0',
    );
    expect(parseYoutubeVideoId('https://example.com/watch?v=AbCdEf12345')).toBeNull();
  });

  it('selects the next event using the invitation timezone', () => {
    const state = getGuestEventCountdownState(
      [event],
      Date.parse('2027-08-16T23:00:00.000Z'),
      'Asia/Jakarta',
    );

    expect(state).toMatchObject({
      event: { id: event.id },
      label: 'Menuju Akad Nikah',
      phase: 'upcoming',
      remaining: { hours: 2 },
    });
  });

  it('creates public-safe calendar payloads without personal guest data', () => {
    const calendar = createGuestEventCalendarFile([event], 'Asia/Jakarta');

    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('DTSTART;TZID=Asia/Jakarta:20270817T080000');
    expect(calendar).toContain('SUMMARY:Akad Nikah');
    expect(calendar).toContain('Masuk melalui gerbang selatan.');
    expect(calendar).not.toContain('guestToken');
    expect(calendar).not.toContain('/g/');
  });

  it('builds route and Google Calendar handoffs from structured event data', () => {
    const route = new URL(getGuestEventRouteHref(event)!);
    expect(route.hostname).toBe('www.google.com');
    expect(route.pathname).toBe('/maps/dir/');
    expect(route.searchParams.get('destination')).toBe('-6.2,106.816666');
    expect(route.searchParams.get('destination_place_id')).toBe('seraya-place-id');

    const calendar = new URL(getGoogleCalendarHref(event, 'Asia/Jakarta'));
    expect(calendar.hostname).toBe('calendar.google.com');
    expect(calendar.searchParams.get('ctz')).toBe('Asia/Jakarta');
    expect(calendar.searchParams.get('text')).toBe('Akad Nikah');
  });

  it('uses a valid manual maps link only when structured location is unavailable', () => {
    expect(
      getGuestEventRouteHref({
        ...event,
        address: null,
        latitude: null,
        longitude: null,
        placeId: null,
        venueName: null,
      }),
    ).toBe(event.mapsHref);
  });
});
