import { randomUUID } from 'node:crypto';

import { DEFAULT_INVITATION_TEMPLATE_KEY } from '@/modules/invitation-templates/invitation-template.keys';
import { getProjectCoupleLabel } from '@/modules/projects/project.mapper';

import {
  invitationDraftContentSchema,
  type InvitationDraftContent,
} from './invitation-draft.schema';

export type InvitationDraftProjectSource = {
  default_timezone: string;
  event_date_primary: string;
  person_one_name: string;
  person_two_name: string;
};

/**
 * Application-side equivalent of the M0005 database trigger payload. It is
 * intentionally pure so tests can verify the stored draft contract without
 * relying on a browser or future editor implementation.
 */
export function createDefaultInvitationDraftContent(
  project: InvitationDraftProjectSource,
): InvitationDraftContent {
  return invitationDraftContentSchema.parse({
    closing: {
      enabled: false,
      message: null,
      signature: null,
    },
    digitalGift: {
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    },
    couple: {
      personOne: {
        displayName: project.person_one_name,
        fullName: null,
        parentLine: null,
      },
      personTwo: {
        displayName: project.person_two_name,
        fullName: null,
        parentLine: null,
      },
    },
    eventSchedule: {
      events: [
        {
          arrivalNote: null,
          countdownEnabled: true,
          date: project.event_date_primary,
          endTime: null,
          id: randomUUID(),
          latitude: null,
          livestreamDescription: null,
          livestreamEnabled: false,
          livestreamHeading: null,
          livestreamPostEventMode: 'recording',
          livestreamPreEventMessage: null,
          livestreamUrl: null,
          locationSource: null,
          longitude: null,
          mapsUrl: null,
          placeId: null,
          startTime: '08:00',
          title: 'Akad Nikah',
          venueAddress: null,
          venueName: null,
        },
      ],
    },
    events: {
      ceremony: {
        date: project.event_date_primary,
        enabled: true,
        endTime: null,
        startTime: '08:00',
        title: 'Akad Nikah',
      },
      enabled: true,
      primaryDate: project.event_date_primary,
      reception: {
        date: null,
        enabled: false,
        endTime: null,
        startTime: null,
        title: null,
      },
    },
    gallery: {
      enabled: false,
      imageIds: [],
    },
    hero: {
      eyebrow: 'The Wedding Of',
      subtitle: null,
      title: getProjectCoupleLabel(project.person_one_name, project.person_two_name),
    },
    location: {
      address: null,
      enabled: false,
      mapsUrl: null,
      venueName: null,
    },
    meta: {
      locale: 'id-ID',
      timezone: project.default_timezone,
    },
    rsvp: {
      enabled: true,
      heading: null,
      lead: null,
    },
    story: {
      body: null,
      enabled: false,
      heading: null,
    },
    templateKey: DEFAULT_INVITATION_TEMPLATE_KEY,
  }) as InvitationDraftContent;
}
