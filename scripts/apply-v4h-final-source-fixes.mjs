import { readFile, writeFile } from 'node:fs/promises';

async function update(path, transform) {
  const source = await readFile(path, 'utf8');
  const next = transform(source);
  if (next === source) return;
  await writeFile(path, next, 'utf8');
}

await update('src/components/projects/event-utility-editor-fields.tsx', (source) => {
  let next = source
    .replace("\nimport { FieldError } from './invitation-editor-fields';\n", '\n')
    .replace('options: { fields: string[]; types: string[] },', 'options: { fields: string[] },')
    .replace("          types: ['establishment', 'geocode'],\n", '');

  const helperMarker = 'function UtilityFieldError';
  const firstHelper = next.indexOf(helperMarker);
  const duplicateHelper =
    firstHelper >= 0 ? next.indexOf(helperMarker, firstHelper + helperMarker.length) : -1;

  if (duplicateHelper >= 0) {
    const loadMapsStart = next.indexOf('\n\nfunction loadGoogleMaps', duplicateHelper);
    if (loadMapsStart < 0) {
      throw new Error('Unable to remove duplicate V4H field-error helper.');
    }
    next = `${next.slice(0, duplicateHelper)}${next.slice(loadMapsStart + 2)}`;
  }

  return next;
});

await update('src/modules/invitations/invitation-editor.schema.ts', (source) =>
  source.replace(
    `const eventScheduleEventInputKeys = [
  'id',
  'title',
  'date',
  'startTime',
  'endTime',
  'venueName',
  'venueAddress',
  'mapsUrl',
] as const;`,
    `const eventScheduleEventInputKeys = [
  'id',
  'title',
  'date',
  'startTime',
  'endTime',
  'venueName',
  'venueAddress',
  'mapsUrl',
  'countdownEnabled',
  'arrivalNote',
  'locationSource',
  'placeId',
  'latitude',
  'longitude',
  'livestreamEnabled',
  'livestreamUrl',
  'livestreamHeading',
] as const;`,
  ),
);

await update('src/modules/invitation-templates/guest-event-utility-core.ts', (source) => {
  let next = source.replace(
    `  const query =
    event.placeId ??
    (typeof event.latitude === 'number' && typeof event.longitude === 'number'`,
    `  const query =
    (event.placeId ? \`place_id:${'${event.placeId}'}\` : null) ??
    (typeof event.latitude === 'number' && typeof event.longitude === 'number'`,
  );

  next = next.replace(
    `function getCalendarEndTime(event: GuestEventUtilityEvent) {
  if (event.endTime) {
    return event.endTime;
  }

  const [hour, minute] = event.startTime.split(':').map(Number);
  const totalMinutes = (hour * 60 + minute + 240) % (24 * 60);
  return \`${'${String(Math.floor(totalMinutes / 60)).padStart(2, \'0\')}'}:${'${String(totalMinutes % 60).padStart(2, \'0\')}'}\`;
}`,
    `function getCalendarEnd(event: GuestEventUtilityEvent) {
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
}`,
  );

  next = next.replace(
    `      \`DTEND;TZID=${'${escapeCalendarText(timeZone)}'}:${'${compactCalendarDateTime(event.date, getCalendarEndTime(event))}'}\`,`,
    `      \`DTEND;TZID=${'${escapeCalendarText(timeZone)}'}:${'${compactCalendarDateTime(calendarEnd.date, calendarEnd.time)}'}\`,`,
  );
  next = next.replace(
    `    const location = [event.venueName, event.address].filter(Boolean).join(', ');
    const description = createCalendarDescription(event);`,
    `    const location = [event.venueName, event.address].filter(Boolean).join(', ');
    const description = createCalendarDescription(event);
    const calendarEnd = getCalendarEnd(event);`,
  );
  next = next.replace(
    `    \`${'${compactCalendarDateTime(event.date, event.startTime)}'}/${'${compactCalendarDateTime(event.date, getCalendarEndTime(event))}'}\`,`,
    `    \`${'${compactCalendarDateTime(event.date, event.startTime)}'}/${'${compactCalendarDateTime(getCalendarEnd(event).date, getCalendarEnd(event).time)}'}\`,`,
  );

  return next;
});

await update('src/modules/invitation-templates/guest-event-utility.tsx', (source) =>
  source.replace('Guest event utility', 'Jadwal & akses acara'),
);
