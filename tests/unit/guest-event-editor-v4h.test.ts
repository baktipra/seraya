import { describe, expect, it } from 'vitest';

import {
  createDefaultInvitationDraftContent,
} from '@/modules/invitations/invitation-draft.defaults';
import {
  invitationDraftContentSchema,
} from '@/modules/invitations/invitation-draft.schema';
import {
  createInvitationEditorSubmissionPayload,
} from '@/modules/invitations/invitation-editor-local-state';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

describe('V4H guest event editor contract', () => {
  it('creates safe utility defaults without changing the persisted schema version', () => {
    const content = createDefaultInvitationDraftContent(project);

    expect(content.eventSchedule.events[0]).toMatchObject({
      arrivalNote: null,
      countdownEnabled: true,
      latitude: null,
      livestreamEnabled: false,
      livestreamHeading: null,
      livestreamUrl: null,
      locationSource: null,
      longitude: null,
      placeId: null,
    });
  });

  it('includes structured event utility fields in the strict editor payload', () => {
    const content = createDefaultInvitationDraftContent(project);
    const event = content.eventSchedule.events[0]!;
    const nextContent = {
      ...content,
      eventSchedule: {
        events: [
          {
            ...event,
            arrivalNote: 'Masuk melalui gerbang selatan.',
            latitude: -6.2,
            livestreamEnabled: true,
            livestreamHeading: 'Siaran Akad Nikah',
            livestreamUrl: 'https://www.youtube.com/live/AbCdEf12345',
            locationSource: 'google_place' as const,
            longitude: 106.816666,
            placeId: 'seraya-place-id',
          },
        ],
      },
    };

    expect(
      createInvitationEditorSubmissionPayload(nextContent).eventSchedule.events[0],
    ).toMatchObject({
      arrivalNote: 'Masuk melalui gerbang selatan.',
      countdownEnabled: true,
      latitude: '-6.2',
      livestreamEnabled: true,
      livestreamHeading: 'Siaran Akad Nikah',
      livestreamUrl: 'https://www.youtube.com/live/AbCdEf12345',
      locationSource: 'google_place',
      longitude: '106.816666',
      placeId: 'seraya-place-id',
    });
  });

  it('accepts a complete structured location and valid YouTube livestream', () => {
    const content = createDefaultInvitationDraftContent(project);
    const event = content.eventSchedule.events[0]!;
    const parsed = invitationDraftContentSchema.parse({
      ...content,
      eventSchedule: {
        events: [
          {
            ...event,
            latitude: -6.2,
            livestreamEnabled: true,
            livestreamUrl: 'https://youtu.be/AbCdEf12345',
            locationSource: 'manual_pin',
            longitude: 106.816666,
          },
        ],
      },
    });

    expect(parsed.eventSchedule.events[0]).toMatchObject({
      latitude: -6.2,
      livestreamEnabled: true,
      locationSource: 'manual_pin',
      longitude: 106.816666,
    });
  });

  it('rejects partial coordinates and invalid livestream hosts', () => {
    const content = createDefaultInvitationDraftContent(project);
    const event = content.eventSchedule.events[0]!;

    expect(() =>
      invitationDraftContentSchema.parse({
        ...content,
        eventSchedule: {
          events: [
            {
              ...event,
              latitude: -6.2,
              locationSource: 'manual_pin',
              longitude: null,
            },
          ],
        },
      }),
    ).toThrow(/latitude dan longitude/i);

    expect(() =>
      invitationDraftContentSchema.parse({
        ...content,
        eventSchedule: {
          events: [
            {
              ...event,
              livestreamEnabled: true,
              livestreamUrl: 'https://example.com/live/AbCdEf12345',
            },
          ],
        },
      }),
    ).toThrow(/YouTube/i);
  });
});
