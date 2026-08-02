'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import type { DeliveryContactActionState } from './delivery.action-state';
import { deriveDeliveryDistribution } from './delivery-distribution';
import { getGuestDistributionCenterForVerifiedProject } from './delivery-handoff.service';
import { requireCurrentUser } from '@/modules/auth/current-user';
import { appendGuestFollowUpEventForVerifiedProject } from '@/modules/follow-up/follow-up.repository';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { getOwnedProjectById } from '@/modules/projects/project.repository';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type BoundInput = { guestId: string; projectId: string };

function revalidateDistributionSurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/delivery`);
  revalidatePath(`/dashboard/${projectId}/follow-up`);
  revalidatePath(`/dashboard/${projectId}/rsvp`);
}

/**
 * Records only an explicit owner assertion that contact happened. It does not
 * claim that WhatsApp sent, delivered, opened, or read anything.
 */
export async function recordCanonicalInitialContactAction(
  boundInput: BoundInput,
  _previousState: DeliveryContactActionState,
  formData: FormData,
): Promise<DeliveryContactActionState> {
  if (formData.get('confirmManualContact') !== 'true') {
    return { message: 'Konfirmasi kontak manual tidak valid.', status: 'error' };
  }

  try {
    const user = await requireCurrentUser();
    const project = await getOwnedProjectById(boundInput.projectId, user.id);
    const [center, guestCandidate] = await Promise.all([
      getGuestDistributionCenterForVerifiedProject(project),
      getActiveGuestForVerifiedProjectWithAdmin(project, boundInput.guestId),
    ]);
    const guest = assertGuestBelongsToProject(guestCandidate, project.id);
    const row = center.rows.find((candidate) => candidate.guestId === guest.id);

    if (!row) {
      return { message: 'Pencatatan kontak tidak tersedia untuk tamu ini.', status: 'error' };
    }

    const truth = deriveDeliveryDistribution(row);
    if (truth.distributionState === 'contact_recorded') {
      return {
        message: 'Tamu ini sudah ditandai pernah dihubungi.',
        resultKey: randomUUID(),
        status: 'success',
      };
    }

    if (!truth.canRecordContact) {
      return {
        message: 'Siapkan pembagian terlebih dahulu sebelum menandai tamu sudah dihubungi.',
        status: 'error',
      };
    }

    await appendGuestFollowUpEventForVerifiedProject({
      channel: 'whatsapp',
      eventType: 'manual_contact_recorded',
      guestId: guest.id,
      messageKind: 'initial_invitation',
      metadata: {
        noteCategory: 'owner_contact_assertion',
        sourceSurface: 'delivery_center',
        templateVersion: 'manual-handoff-v1',
      },
      occurredAt: new Date().toISOString(),
      project,
    });
    revalidateDistributionSurfaces(project.id);

    return {
      message: 'Ditandai sudah dihubungi oleh owner.',
      resultKey: randomUUID(),
      status: 'success',
    };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Pencatatan kontak tidak tersedia untuk tamu ini.', status: 'error' };
    }

    console.error('Seraya manual contact recording failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return {
      message: 'Status kontak belum dapat dicatat. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}
