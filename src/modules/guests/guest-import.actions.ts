'use server';

import { revalidatePath } from 'next/cache';

import type { GuestImportActionState } from './guest-import.action-state';
import { GuestCsvValidationError } from './guest-csv';
import { guestProjectIdSchema } from './guest.schema';
import { importGuestCsvForCurrentUser, isGuestRepositoryFailure } from './guest.service';
import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

/** Server Action module intentionally exports async functions only. */
export async function importGuestsCsvAction(
  _previousState: GuestImportActionState,
  formData: FormData,
): Promise<GuestImportActionState> {
  const projectId = guestProjectIdSchema.safeParse(formData.get('projectId'));
  const file = formData.get('file');

  if (!projectId.success || !(file instanceof File)) {
    return { message: 'Pilih file CSV yang akan diimpor.', status: 'error' };
  }

  try {
    const importedCount = await importGuestCsvForCurrentUser({ file, projectId: projectId.data });

    revalidatePath(`/dashboard/${projectId.data}`);
    revalidatePath(`/dashboard/${projectId.data}/guests`);

    return { message: `${importedCount} tamu berhasil ditambahkan.`, status: 'success' };
  } catch (error) {
    if (error instanceof GuestCsvValidationError) {
      return { message: error.publicMessage, status: 'error' };
    }

    if (error instanceof AuthenticationRequiredError || error instanceof ProjectAccessDeniedError) {
      return { message: 'CSV tidak dapat diimpor ke undangan ini.', status: 'error' };
    }

    if (isGuestRepositoryFailure(error)) {
      console.error('Seraya guest CSV import repository failure.', {
        errorName: error.name,
      });
    } else {
      console.error('Seraya guest CSV import failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return { message: 'CSV belum bisa diimpor. Coba lagi beberapa saat lagi.', status: 'error' };
  }
}
