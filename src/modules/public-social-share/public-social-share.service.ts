import 'server-only';

import { siteConfig } from '@/config/site';
import type { OwnedProject } from '@/modules/projects/project.repository';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.service';

import {
  assertPublicShareModelIsPersonalDataFree,
  createCanonicalPublicInvitationUrl,
  type PublicSocialShareModel,
} from './public-social-share.core';

function formatEventDate(date: string, timeZone: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    timeZone,
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function selectPrimaryPublishedEvent(
  events: Array<{
    date: string;
    startTime: string;
    title: string;
    venueAddress: string | null;
    venueName: string | null;
  }>,
) {
  return [...events].sort((left, right) => {
    return `${left.date}T${left.startTime}`.localeCompare(`${right.date}T${right.startTime}`);
  })[0];
}

export async function getPublicSocialShareForVerifiedProject(
  project: OwnedProject,
): Promise<PublicSocialShareModel | null> {
  const publication = await getCurrentPublishedInvitationForVerifiedProject(project);
  if (!publication) return null;

  const { draft } = publication.snapshot;
  const event = selectPrimaryPublishedEvent(draft.eventSchedule.events);
  if (!event) return null;

  return assertPublicShareModelIsPersonalDataFree({
    coupleLabel: `${draft.couple.personOne.displayName} & ${draft.couple.personTwo.displayName}`,
    eventDate: formatEventDate(event.date, publication.snapshot.project.timezone),
    eventTitle: event.title,
    paletteKey: draft.paletteKey,
    publicUrl: createCanonicalPublicInvitationUrl(
      siteConfig.url,
      publication.snapshot.project.slug,
    ),
    revision: publication.revision,
    snapshotId: publication.id,
    templateKey: draft.templateKey,
    venueAddress: event.venueAddress,
    venueName: event.venueName,
  });
}
