const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function getUtcDateFromDateOnly(value: string) {
  const match = dateOnlyPattern.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Date-only values from the draft deliberately use UTC date construction and
 * UTC formatting. This prevents the calendar day from drifting when a browser
 * or server runs west of the event's timezone.
 */
export function formatInvitationDate(value: string | null, locale = 'id-ID') {
  if (!value) {
    return null;
  }

  const date = getUtcDateFromDateOnly(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}

/** Times are stored as local wall-clock values, so they are never timezone-converted. */
export function formatInvitationTime(value: string | null) {
  if (!value || !timePattern.test(value)) {
    return null;
  }

  return value.replace(':', '.');
}
