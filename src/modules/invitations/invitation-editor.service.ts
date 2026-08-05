import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { resolveInvitationThemePaletteKey } from '@/modules/invitation-templates/core/theme-package.registry';
import { assertInvitationAudioReadyForVerifiedProject } from '@/modules/media/invitation-audio.service';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  getActiveInvitationDraftForVerifiedProject,
  updateActiveInvitationDraftForVerifiedProject,
} from './invitation-draft.repository';
import {
  getInvitationEditorFieldErrors,
  type InvitationEditorFieldErrors,
  type InvitationEditorFormInput,
} from './invitation-editor.schema';
import {
  derivePrimaryEventCompatibility,
  invitationDraftContentSchema,
  type EventScheduleV1,
} from './invitation-draft.schema';
import type { InvitationDraft } from './invitation-draft.types';

export class InvitationEditorDraftUnavailableError extends Error {
  constructor() {
    super('The active invitation draft is unavailable.');
    this.name = 'InvitationEditorDraftUnavailableError';
  }
}

export class InvitationEditorValidationError extends Error {
  readonly fieldErrors: InvitationEditorFieldErrors;

  constructor(fieldErrors: InvitationEditorFieldErrors) {
    super('The invitation editor submission is invalid.');
    this.name = 'InvitationEditorValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export type OwnedInvitationEditor = {
  draft: InvitationDraft;
  project: OwnedProject;
};

/** Route-internal loader after server-owned project verification. */
export async function getInvitationEditorForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedInvitationEditor> {
  const draft = await getActiveInvitationDraftForVerifiedProject(project);

  if (!draft) {
    throw new InvitationEditorDraftUnavailableError();
  }

  return { draft, project };
}

/** Owner-scoped editor loader. It does not load snapshots or public route data. */
export async function getInvitationEditorForCurrentUser(
  projectId: string,
): Promise<OwnedInvitationEditor> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);

  return getInvitationEditorForVerifiedProject(project);
}

function normalizeOptionalCoordinate(value: string | undefined) {
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
) {
  const eventSchedule: EventScheduleV1 = {
    events: input.eventSchedule.events.map((event) => ({
      arrivalNote: normalizeOptionalText(event.arrivalNote),
      countdownEnabled: event.countdownEnabled !== false,
      date: event.date,
      endTime: event.endTime,
      id: event.id,
      latitude: normalizeOptionalCoordinate(event.latitude),
      livestreamDescription: normalizeOptionalText(event.livestreamDescription),
      livestreamEnabled: event.livestreamEnabled === true,
      livestreamHeading: normalizeOptionalText(event.livestreamHeading),
      livestreamPostEventMode: event.livestreamPostEventMode === 'hide' ? 'hide' : 'recording',
      livestreamPreEventMessage: normalizeOptionalText(event.livestreamPreEventMessage),
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
    })),
  };
  const primaryCompatibility = derivePrimaryEventCompatibility(eventSchedule);
  const coupleIdentity = input.coupleIdentity ?? {
    monogram: { enabled: false, style: 'initials', text: '' },
    shortName: '',
    socialLinks: { instagram: '', tiktok: '', website: '' },
    weddingHashtag: '',
  };
  const opening = input.opening ?? { message: '', quote: '', treatment: 'soft' };
  const paletteCandidate =
    input.paletteKey ??
    (input.templateKey === currentContent.templateKey ? currentContent.paletteKey : undefined);

  return {
    ...currentContent,
    closing: {
      enabled: input.closing.enabled,
      message: input.closing.message,
      signature: input.closing.signature,
    },
    coupleIdentity: {
      monogram: {
        enabled: coupleIdentity.monogram.enabled,
        style:
          coupleIdentity.monogram.style === 'joined_initials' ||
          coupleIdentity.monogram.style === 'wordmark'
            ? coupleIdentity.monogram.style
            : 'initials',
        text: coupleIdentity.monogram.text,
      },
      shortName: coupleIdentity.shortName,
      socialLinks: {
        instagram: coupleIdentity.socialLinks.instagram,
        tiktok: coupleIdentity.socialLinks.tiktok,
        website: coupleIdentity.socialLinks.website,
      },
      weddingHashtag: coupleIdentity.weddingHashtag,
    },
    digitalGift: {
      accounts: input.digitalGift.accounts.map((account) => ({
        accountHolder: account.accountHolder,
        accountNumber: account.accountNumber,
        id: account.id,
        providerName: account.providerName,
      })),
      enabled: input.digitalGift.enabled,
      heading: input.digitalGift.heading,
      lead: input.digitalGift.lead,
    },
    couple: {
      personOne: {
        displayName: input.couple.personOne.displayName,
        fullName: input.couple.personOne.fullName,
        parentLine: input.couple.personOne.parentLine,
      },
      personTwo: {
        displayName: input.couple.personTwo.displayName,
        fullName: input.couple.personTwo.fullName,
        parentLine: input.couple.personTwo.parentLine,
      },
    },
    // The client submits only this canonical schedule. Existing `events` and
    // `location` fields are derived here from the first event, preventing any
    // browser-originated conflict between the primary summary and schedule.
    eventSchedule,
    events: primaryCompatibility.events,
    location: primaryCompatibility.location,
    hero: {
      eyebrow: input.hero.eyebrow,
      subtitle: input.hero.subtitle,
      title: input.hero.title,
    },
    // meta and gallery intentionally stay sourced from the verified active
    // draft. The editor has no controls for them, so client input cannot mutate
    // timezone, gallery membership, or schema-level metadata.
    meta: currentContent.meta,
    gallery: currentContent.gallery,
    opening: {
      message: opening.message,
      quote: opening.quote,
      treatment:
        opening.treatment === 'editorial' || opening.treatment === 'ceremonial'
          ? opening.treatment
          : 'soft',
    },
    rsvp: {
      enabled: input.rsvp.enabled,
      heading: input.rsvp.heading,
      lead: input.rsvp.lead,
    },
    story: {
      body: input.story.body,
      enabled: input.story.enabled,
      heading: input.story.heading,
    },
    paletteKey: resolveInvitationThemePaletteKey(input.templateKey, paletteCandidate),
    templateKey: input.templateKey,
  };
}

/**
 * Saves only the current private draft after fresh authentication and project
 * ownership verification. Snapshot records are not read or written here.
 */
export async function saveInvitationEditorDraftForCurrentUser(
  input: InvitationEditorFormInput,
): Promise<InvitationDraft> {
  const editor = await getInvitationEditorForCurrentUser(input.projectId);
  const candidateContent = applyEditorInputToActiveDraft(editor.draft.content, input.content);
  const parsedContent = invitationDraftContentSchema.safeParse(candidateContent);

  if (!parsedContent.success) {
    throw new InvitationEditorValidationError(getInvitationEditorFieldErrors(parsedContent.error));
  }

  await assertInvitationAudioReadyForVerifiedProject({
    content: parsedContent.data,
    project: editor.project,
  });

  return updateActiveInvitationDraftForVerifiedProject({
    content: parsedContent.data,
    draft: editor.draft,
    project: editor.project,
  });
}
