import { readFile, writeFile } from 'node:fs/promises';

async function patchFile(path, patches) {
  let source = await readFile(path, 'utf8');

  for (const patch of patches) {
    if (source.includes(patch.after)) continue;
    if (!source.includes(patch.before)) {
      throw new Error(`V4H patch anchor unavailable in ${path}: ${patch.name}`);
    }
    source = source.replace(patch.before, patch.after);
  }

  await writeFile(path, source, 'utf8');
}

await patchFile('src/modules/invitations/invitation-editor.schema.ts', [
  {
    name: 'runtime event utility fields',
    before: `                  .object({
                    date: formTextSchema,
                    endTime: formTextSchema,
                    id: z.string().regex(databaseUuidShape, 'ID acara tidak valid.'),
                    mapsUrl: formTextSchema,
                    startTime: formTextSchema,
                    title: formTextSchema,
                    venueAddress: formTextSchema,
                    venueName: formTextSchema,
                  })`,
    after: `                  .object({
                    arrivalNote: formTextSchema.optional(),
                    countdownEnabled: checkboxInputSchema.optional(),
                    date: formTextSchema,
                    endTime: formTextSchema,
                    id: z.string().regex(databaseUuidShape, 'ID acara tidak valid.'),
                    latitude: formTextSchema.optional(),
                    livestreamEnabled: checkboxInputSchema.optional(),
                    livestreamHeading: formTextSchema.optional(),
                    livestreamUrl: formTextSchema.optional(),
                    locationSource: formTextSchema.optional(),
                    longitude: formTextSchema.optional(),
                    mapsUrl: formTextSchema,
                    placeId: formTextSchema.optional(),
                    startTime: formTextSchema,
                    title: formTextSchema,
                    venueAddress: formTextSchema,
                    venueName: formTextSchema,
                  })`,
  },
]);

await patchFile('src/modules/invitations/invitation-editor.service.ts', [
  {
    name: 'optional coordinate normalizer',
    before: `function applyEditorInputToActiveDraft(
  currentContent: InvitationDraft['content'],
  input: InvitationEditorFormInput['content'],
) {`,
    after: `function normalizeOptionalCoordinate(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? Number(normalized) : null;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function applyEditorInputToActiveDraft(
  currentContent: InvitationDraft['content'],
  input: InvitationEditorFormInput['content'],
) {`,
  },
  {
    name: 'event utility persistence',
    before: `    events: input.eventSchedule.events.map((event) => ({
      date: event.date,
      endTime: event.endTime,
      id: event.id,
      mapsUrl: event.mapsUrl,
      startTime: event.startTime,
      title: event.title,
      venueAddress: event.venueAddress,
      venueName: event.venueName,
    })),`,
    after: `    events: input.eventSchedule.events.map((event) => ({
      arrivalNote: normalizeOptionalText(event.arrivalNote),
      countdownEnabled: event.countdownEnabled !== false,
      date: event.date,
      endTime: event.endTime,
      id: event.id,
      latitude: normalizeOptionalCoordinate(event.latitude),
      livestreamEnabled: event.livestreamEnabled === true,
      livestreamHeading: normalizeOptionalText(event.livestreamHeading),
      livestreamUrl: normalizeOptionalText(event.livestreamUrl),
      locationSource:
        event.locationSource === 'google_place' ||
        event.locationSource === 'current_location' ||
        event.locationSource === 'manual_pin'
          ? event.locationSource
          : null,
      longitude: normalizeOptionalCoordinate(event.longitude),
      mapsUrl: event.mapsUrl,
      placeId: normalizeOptionalText(event.placeId),
      startTime: event.startTime,
      title: event.title,
      venueAddress: event.venueAddress,
      venueName: event.venueName,
    })),`,
  },
]);

await patchFile('src/components/projects/invitation-editor-fields.tsx', [
  {
    name: 'event utility editor import',
    before: `import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
`,
    after: `import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

import { EventUtilityEditorFields } from './event-utility-editor-fields';
`,
  },
  {
    name: 'new event utility defaults',
    before: `  return {
    date: '',
    endTime: null,
    id: createLocalUuid(),
    mapsUrl: null,
    startTime: '',
    title: '',
    venueAddress: null,
    venueName: null,
  };`,
    after: `  return {
    arrivalNote: null,
    countdownEnabled: true,
    date: '',
    endTime: null,
    id: createLocalUuid(),
    latitude: null,
    livestreamEnabled: false,
    livestreamHeading: null,
    livestreamUrl: null,
    locationSource: null,
    longitude: null,
    mapsUrl: null,
    placeId: null,
    startTime: '',
    title: '',
    venueAddress: null,
    venueName: null,
  };`,
  },
  {
    name: 'event utility editor composition',
    before: `        <div className="sm:col-span-2">
          <EditorTextField
            error={getError(errors, \`${'${eventPrefix}'}.mapsUrl\`)}
            help="Gunakan tautan HTTPS yang valid."
            label="Tautan peta (opsional)"
            name={\`${'${eventPrefix}'}.mapsUrl\`}
            onValueChange={(value) => onChange({ ...event, mapsUrl: value })}
            value={event.mapsUrl}
          />
        </div>
      </div>`,
    after: `        <div className="sm:col-span-2">
          <EditorTextField
            error={getError(errors, \`${'${eventPrefix}'}.mapsUrl\`)}
            help="Gunakan tautan HTTPS yang valid."
            label="Tautan peta (opsional)"
            name={\`${'${eventPrefix}'}.mapsUrl\`}
            onValueChange={(value) => onChange({ ...event, mapsUrl: value })}
            value={event.mapsUrl}
          />
        </div>
        <EventUtilityEditorFields
          errors={errors}
          event={event}
          eventPrefix={eventPrefix}
          onChange={onChange}
        />
      </div>`,
  },
]);
