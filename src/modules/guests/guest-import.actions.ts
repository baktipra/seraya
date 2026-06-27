'use server';

import { revalidatePath } from 'next/cache';

import type { GuestImportActionState } from './guest-import.action-state';
import { GuestCsvValidationError } from './guest-csv';
import { guestProjectIdSchema } from './guest.schema';
import { GuestXlsxValidationError } from './guest-xlsx';
import {
  importGuestCsvForCurrentUser,
  importGuestXlsxForCurrentUser,
  isGuestRepositoryFailure,
} from './guest.service';
import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidateGuestImportSurfaces(projectId: string, includeDelivery = false) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/guests`);

  if (includeDelivery) {
    revalidatePath(`/dashboard/${projectId}/delivery`);
  }
}

function getImportRequest(formData: FormData, format: 'CSV' | 'Excel') {
  const projectId = guestProjectIdSchema.safeParse(formData.get('projectId'));
  const file = formData.get('file');

  if (!projectId.success || !(file instanceof File)) {
    return {
      error: { message: `Pilih file ${format} yang akan diimpor.`, status: 'error' as const },
      file: null,
      projectId: null,
    };
  }

  return { error: null, file, projectId: projectId.data };
}

function importFailureState(error: unknown, format: 'CSV' | 'Excel'): GuestImportActionState {
  if (error instanceof GuestCsvValidationError || error instanceof GuestXlsxValidationError) {
    return { message: error.publicMessage, status: 'error' };
  }

  if (error instanceof AuthenticationRequiredError || error instanceof ProjectAccessDeniedError) {
    return { message: `${format} tidak dapat diimpor ke undangan ini.`, status: 'error' };
  }

  if (isGuestRepositoryFailure(error)) {
    console.error(`Seraya guest ${format} import repository failure.`, {
      errorName: error.name,
    });
  } else {
    console.error(`Seraya guest ${format} import failed.`, {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }

  return {
    message: `${format} belum bisa diimpor. Coba lagi beberapa saat lagi.`,
    status: 'error',
  };
}

/** Server Action module intentionally exports async functions only. */
export async function importGuestsCsvAction(
  _previousState: GuestImportActionState,
  formData: FormData,
): Promise<GuestImportActionState> {
  const request = getImportRequest(formData, 'CSV');

  if (request.error || !request.file || !request.projectId) {
    return request.error ?? { message: 'Pilih file CSV yang akan diimpor.', status: 'error' };
  }

  try {
    const importedCount = await importGuestCsvForCurrentUser({
      file: request.file,
      projectId: request.projectId,
    });

    revalidateGuestImportSurfaces(request.projectId);
    return { message: `${importedCount} tamu berhasil ditambahkan.`, status: 'success' };
  } catch (error) {
    return importFailureState(error, 'CSV');
  }
}

/** XLSX import remains owner-only and add-only; it never prepares or sends personal links. */
export async function importGuestsXlsxAction(
  _previousState: GuestImportActionState,
  formData: FormData,
): Promise<GuestImportActionState> {
  const request = getImportRequest(formData, 'Excel');

  if (request.error || !request.file || !request.projectId) {
    return request.error ?? { message: 'Pilih file Excel yang akan diimpor.', status: 'error' };
  }

  try {
    const importedCount = await importGuestXlsxForCurrentUser({
      file: request.file,
      projectId: request.projectId,
    });

    revalidateGuestImportSurfaces(request.projectId, true);
    return {
      message: `${importedCount} tamu berhasil ditambahkan. Buat Undangan Pribadi di Delivery Center sebelum membagikannya untuk RSVP dan ucapan.`,
      status: 'success',
    };
  } catch (error) {
    return importFailureState(error, 'Excel');
  }
}
