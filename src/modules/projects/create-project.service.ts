import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { resolveInvitationThemePaletteKey } from '@/modules/invitation-templates/core/theme-package.registry';
import {
  getActiveInvitationDraftForVerifiedProject,
  updateActiveInvitationDraftForVerifiedProject,
} from '@/modules/invitations/invitation-draft.repository';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';

import type { CreateProjectInput } from './create-project.schema';
import { createWeddingProject } from './project.repository';

/**
 * Server-owned project creation boundary. account_id is intentionally derived
 * from the authenticated Supabase session and is never accepted from form data.
 */
export async function createProjectForCurrentUser(input: CreateProjectInput) {
  const user = await requireCurrentUser();
  const project = await createWeddingProject({
    accountId: user.id,
    eventCity: input.eventCity,
    eventDatePrimary: input.eventDatePrimary,
    personOneName: input.personOneName,
    personTwoName: input.personTwoName,
    slug: input.slug,
  });

  // M0005 creates the initial draft in the same database transaction as the
  // project. The selected collection is then applied through the existing
  // verified-draft repository boundary without changing schema or trigger rules.
  try {
    const draft = await getActiveInvitationDraftForVerifiedProject(project);

    if (draft) {
      const candidate = invitationDraftContentSchema.safeParse({
        ...draft.content,
        paletteKey: resolveInvitationThemePaletteKey(input.templateKey, undefined),
        templateKey: input.templateKey,
      });

      if (candidate.success) {
        await updateActiveInvitationDraftForVerifiedProject({
          content: candidate.data,
          draft,
          project,
        });
      } else {
        console.error('Seraya initial collection validation failed.', {
          projectId: project.id,
          templateKey: input.templateKey,
        });
      }
    } else {
      console.error('Seraya initial invitation draft was unavailable after project creation.', {
        projectId: project.id,
      });
    }
  } catch (error) {
    // The project remains valid and accessible with the database-owned default
    // collection. Do not encourage a retry that could create a duplicate project.
    console.error('Seraya initial collection persistence failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId: project.id,
      templateKey: input.templateKey,
    });
  }

  return project;
}
