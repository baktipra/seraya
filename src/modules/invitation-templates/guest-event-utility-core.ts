export type GuestEventUtilityEvent = {
  address: string | null;
  arrivalNote?: string | null;
  countdownEnabled?: boolean;
  date: string;
  endTime: string | null;
  id: string;
  latitude?: number | null;
  livestreamEnabled?: boolean;
  livestreamHeading?: string | null;
  livestreamUrl?: string | null;
  locationSource?: 'current_location' | 'google_place' | 'manual_pin' | null;
  longitude?: number | null;
  mapsHref: string | null;
  placeId?: string | null;
  startTime: string;
  title: string;
  venueName: string | null;
};

export type GuestEventCountdownState = {
  event: GuestEventUtilityEvent;
  label: string;
  phase: 'active' | 'complete' | 'upcoming';
  remaining: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
};

const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{6,15}$/;
const compactDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const compactTimePattern = /^\d{2}:\d{2}$/;
const defaultEventDurationMilliseconds = 4 * 60 * 60 * 1000;

function getDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    month: Number(values.month),
    second: Number(values.second),
    year: Number(values.year),
  };
}

function resolveZonedDateTime(date: string, time: string, timeZone: string) {
  if (!compactDatePattern.test(date) || !compactTimePattern.test(time)) {
    return null;
  }

  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  if ([year, month, day, hour, minute].some((value) => !Number.isFinite(value))) {
    return null;
  }

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = targetUtc;

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const zoned = getDateTimeParts(new Date(candidate), timeZone);
      const representedUtc = Date.UTC(
        zoned.year,
        zoned.month - 1,
        zoned.day,
        zoned.hour,
        zoned.minute,
        zoned.second,
      );
      candidate -= representedUtc - targetUtc;
    }
  } catch {
    return null;
  }

  return Number.isFinite(candidate) ? candidate : null;
}

export function getGuestEventEpochRange(event: GuestEventUtilityEvent, timeZone: string) {
  const start = resolveZonedDateTime(event.date, event.startTime, timeZone);

  if (start === null) {
    return null;
  }

  const end = event.endTime
    ? resolveZonedDateTime(event.date, event.endTime, timeZone)
    : start + defaultEventDurationMilliseconds;

  return {
    end: end !== null && end >= start ? end : start + defaultEventDurationMilliseconds,
    start,
  };
}

function createRemaining(duration: number) {
  const safeDuration = Math.max(0, Math.floor(duration / 1000));

  return {
    days: Math.floor(safeDuration / 86_400),
    hours: Math.floor((safeDuration % 86_400) / 3_600),
    minutes: Math.floor((safeDuration % 3_600) / 60),
    seconds: safeDuration % 60,
  };
}

export function getGuestEventCountdownState(
  events: readonly GuestEventUtilityEvent[],
  now: number,
  timeZone: string,
): GuestEventCountdownState | null {
  const scheduled = events
    .filter((event) => event.countdownEnabled !== false)
    .map((event) => ({ event, range: getGuestEventEpochRange(event, timeZone) }))
    .filter(
      (entry): entry is { event: GuestEventUtilityEvent; range: { end: number; start: number } } =>
        entry.range !== null,
    )
    .sort((left, right) => left.range.start - right.range.start);

  const active = scheduled.find(({ range }) => range.start <= now && now < range.end);

  if (active) {
    return {
      event: active.event,
      label: `${active.event.title} sedang berlangsung`,
      phase: 'active',
      remaining: createRemaining(active.range.end - now),
    };
  }

  const upcoming = scheduled.find(({ range }) => range.start > now);

  if (upcoming) {
    return {
      event: upcoming.event,
      label: `Menuju ${upcoming.event.title}`,
      phase: 'upcoming',
      remaining: createRemaining(upcoming.range.start - now),
    };
  }

  const last = scheduled.at(-1);

  return last
    ? {
        event: last.event,
        label: 'Seluruh rangkaian acara telah selesai',
        phase: 'complete',
        remaining: createRemaining(0),
      }
    : null;
}

export function parseYoutubeVideoId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate: string | null = null;

    if (host === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (url.pathname === '/watch') {
        candidate = url.searchParams.get('v');
      } else {
        const segments = url.pathname.split('/').filter(Boolean);
        candidate = ['embed', 'live', 'shorts'].includes(segments[0] ?? '')
          ? (segments[1] ?? null)
          : null;
      }
    }

    return candidate && youtubeVideoIdPattern.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function getYoutubeEmbedHref(value: string | null | undefined) {
  const videoId = parseYoutubeVideoId(value);
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`
    : null;
}

export function getGuestEventRouteHref(event: GuestEventUtilityEvent) {
  if (event.mapsHref) {
    try {
      if (new URL(event.mapsHref).protocol === 'https:') {
        return event.mapsHref;
      }
    } catch {
      // Continue to structured-location fallbacks.
    }
  }

  const coordinates =
    typeof event.latitude === 'number' && typeof event.longitude === 'number'
      ? `${event.latitude},${event.longitude}`
      : null;
  const destination = coordinates ?? event.address ?? event.venueName;

  if (!destination) {
    return null;
  }

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', destination);

  if (event.placeId) {
    url.searchParams.set('destination_place_id', event.placeId);
  }

  return url.toString();
}

export function getGuestEventMapEmbedHref(
  event: GuestEventUtilityEvent,
  apiKey: string | null | undefined,
) {
  if (!apiKey) {
    return null;
  }

  const query =
    (event.placeId ? `place_id:${event.placeId}` : null) ??
    (typeof event.latitude === 'number' && typeof event.longitude === 'number'
      ? `${event.latitude},${event.longitude}`
      : (event.address ?? event.venueName));

  if (!query) {
    return null;
  }

  const url = new URL('https://www.google.com/maps/embed/v1/place');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', query);
  return url.toString();
}

function escapeCalendarText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function compactCalendarDateTime(date: string, time: string) {
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;
}

function getCalendarEnd(event: GuestEventUtilityEvent) {
  if (event.endTime) {
    return { date: event.date, time: event.endTime };
  }

  const [year, month, day] = event.date.split('-').map(Number);
  const [hour, minute] = event.startTime.split(':').map(Number);
  const end = new Date(Date.UTC(year, month - 1, day, hour, minute + 240));

  return {
    date: end.toISOString().slice(0, 10),
    time: end.toISOString().slice(11, 16),
  };
}

function createCalendarDescription(event: GuestEventUtilityEvent) {
  return [
    event.arrivalNote,
    getGuestEventRouteHref(event) ? `Rute: ${getGuestEventRouteHref(event)}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

export function createGuestEventCalendarFile(
  events: readonly GuestEventUtilityEvent[],
  timeZone: string,
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Seraya//Guest Event Utility V1//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const location = [event.venueName, event.address].filter(Boolean).join(', ');
    const description = createCalendarDescription(event);
    const calendarEnd = getCalendarEnd(event);
    const calendarEnd = getCalendarEnd(event);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeCalendarText(event.id)}@seraya`,
      `DTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z')}`,
      `DTSTART;TZID=${escapeCalendarText(timeZone)}:${compactCalendarDateTime(event.date, event.startTime)}`,
      `DTEND;TZID=${escapeCalendarText(timeZone)}:${compactCalendarDateTime(calendarEnd.date, calendarEnd.time)}`,
      `SUMMARY:${escapeCalendarText(event.title)}`,
    );

    if (location) {
      lines.push(`LOCATION:${escapeCalendarText(location)}`);
    }

    if (description) {
      lines.push(`DESCRIPTION:${escapeCalendarText(description)}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function getGoogleCalendarHref(event: GuestEventUtilityEvent, timeZone: string) {
  const url = new URL('https://calendar.google.com/calendar/render');
  const location = [event.venueName, event.address].filter(Boolean).join(', ');

  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', event.title);
  url.searchParams.set(
    'dates',
    `${compactCalendarDateTime(event.date, event.startTime)}/${compactCalendarDateTime(getCalendarEnd(event).date, getCalendarEnd(event).time)}`,
  );
  url.searchParams.set('ctz', timeZone);

  if (location) {
    url.searchParams.set('location', location);
  }

  const details = createCalendarDescription(event);
  if (details) {
    url.searchParams.set('details', details);
  }

  return url.toString();
}
