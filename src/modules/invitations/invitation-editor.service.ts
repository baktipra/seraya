import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

import {
  getActiveInvitationDraftForVerifiedProject,
  updateActiveInvitationDraftForVerifiedProject,
} from './invitation-draft.repository';
import {
  getInvitationEditorFieldErrors,
  type InvitationEditorFieldErrors,
  type InvitationEditorFormInput,
} from './invitation-editor.schema';
import { invitationDraftContentSchema } from './invitation-draft.schema';
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
  project: Awaited<ReturnType<typeof getOwnedProjectById>>;
};

/** Owner-scoped editor loader. It does not load snapshots or public route data. */
export async function getInvitationEditorForCurrentUser(
  projectId: string,
): Promise<OwnedInvitationEditor> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  const draft = await getActiveInvitationDraftForVerifiedProject(project);

  if (!draft) {
    throw new InvitationEditorDraftUnavailableError();
  }

  return { draft, project };
}

function applyEditorInputToActiveDraft(
  currentContent: InvitationDraft['content'],
  input: InvitationEditorFormInput['content'],
) {
  return {
    ...currentContent,
    closing: {
      enabled: input.closing.enabled,
      message: input.closing.message,
      signature: input.closing.signature,
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
    events: {
      ceremony: {
        date: input.events.ceremony.date,
        enabled: input.events.ceremony.enabled,
        endTime: input.events.ceremony.endTime,
        startTime: input.events.ceremony.startTime,
        title: input.events.ceremony.title,
      },
      enabled: input.events.enabled,
      primaryDate: input.events.primaryDate,
      reception: {
        date: input.events.reception.date,
        enabled: input.events.reception.enabled,
        endTime: input.events.reception.endTime,
        startTime: input.events.reception.startTime,
        title: input.events.reception.title,
      },
    },
    hero: {
      eyebrow: input.hero.eyebrow,
      subtitle: input.hero.subtitle,
      title: input.hero.title,
    },
    location: {
      address: input.location.address,
      enabled: input.location.enabled,
      mapsUrl: input.location.mapsUrl,
      venueName: input.location.venueName,
    },
    // meta and gallery intentionally stay sourced from the verified active
    // draft. SRY-016 has no controls for them, so client input cannot mutate
    // timezone, gallery membership, or schema-level metadata.
    meta: currentContent.meta,
    gallery: currentContent.gallery,
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

  return updateActiveInvitationDraftForVerifiedProject({
    content: parsedContent.data,
    draft: editor.draft,
    project: editor.project,
  });
}
