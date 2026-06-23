'use server';

import { redirect } from 'next/navigation';

import { getCreateProjectFieldErrors, parseCreateProjectFormData } from './create-project.schema';
import type { CreateProjectActionState } from './create-project.action-state';
import { createProjectForCurrentUser } from './create-project.service';
import { ProjectRepositoryError, ProjectSlugAlreadyExistsError } from './project.repository';

export async function createProjectAction(
  _previousState: CreateProjectActionState,
  formData: FormData,
): Promise<CreateProjectActionState> {
  const parsed = parseCreateProjectFormData(formData);

  if (!parsed.success) {
    return {
      fieldErrors: getCreateProjectFieldErrors(parsed.error),
      message: 'Periksa lagi detail yang perlu dilengkapi.',
      status: 'error',
    };
  }

  let project: Awaited<ReturnType<typeof createProjectForCurrentUser>>;

  try {
    project = await createProjectForCurrentUser(parsed.data);
  } catch (error) {
    if (error instanceof ProjectSlugAlreadyExistsError) {
      return {
        fieldErrors: { slug: 'Link undangan ini sudah digunakan. Coba variasi lain.' },
        status: 'error',
      };
    }

    if (error instanceof ProjectRepositoryError) {
      console.error('Seraya project creation repository failure.', { errorName: error.name });
    } else {
      console.error('Seraya project creation failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Undangan belum bisa dibuat. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }

  redirect(`/dashboard/${project.id}`);
}
