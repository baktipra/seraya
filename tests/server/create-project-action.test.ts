import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createProjectForCurrentUserMock, redirectMock } = vi.hoisted(() => ({
  createProjectForCurrentUserMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/modules/projects/create-project.service', () => ({
  createProjectForCurrentUser: createProjectForCurrentUserMock,
}));

import { createProjectAction } from '@/modules/projects/create-project.actions';
import { initialCreateProjectActionState } from '@/modules/projects/create-project.action-state';
import {
  ProjectRepositoryError,
  ProjectSlugAlreadyExistsError,
} from '@/modules/projects/project.repository';

function validProjectFormData() {
  const formData = new FormData();
  formData.set('personOneName', 'Raka');
  formData.set('personTwoName', 'Nadia');
  formData.set('eventDatePrimary', '2027-08-17');
  formData.set('eventCity', 'Jakarta');
  formData.set('templateKey', 'roselle');
  formData.set('slug', 'raka-nadia');
  return formData;
}

function createNextRedirectSignal(destination: string) {
  const redirectSignal = new Error('NEXT_REDIRECT');
  Object.assign(redirectSignal, { digest: `NEXT_REDIRECT;replace;${destination};307;` });
  return redirectSignal;
}

describe('SRY-005 create project server action', () => {
  beforeEach(() => {
    createProjectForCurrentUserMock.mockReset();
    redirectMock.mockReset();
  });

  it('returns linked field errors for invalid required values', async () => {
    const state = await createProjectAction(initialCreateProjectActionState, new FormData());

    expect(state.status).toBe('error');
    expect(state.fieldErrors?.personOneName).toBe('Gunakan nama panggilan untuk pasangan pertama.');
    expect(state.fieldErrors?.eventCity).toBe('Kota acara perlu diisi dulu.');
  });

  it('returns a human-safe slug message when the unique constraint wins a race', async () => {
    createProjectForCurrentUserMock.mockRejectedValue(new ProjectSlugAlreadyExistsError());

    const state = await createProjectAction(
      initialCreateProjectActionState,
      validProjectFormData(),
    );

    expect(state).toEqual({
      fieldErrors: { slug: 'Link undangan ini sudah digunakan. Coba variasi lain.' },
      status: 'error',
    });
  });

  it('returns the existing human-safe message when project creation fails in the repository', async () => {
    createProjectForCurrentUserMock.mockRejectedValue(new ProjectRepositoryError());

    const state = await createProjectAction(
      initialCreateProjectActionState,
      validProjectFormData(),
    );

    expect(state).toEqual({
      message: 'Undangan belum bisa dibuat. Coba lagi beberapa saat lagi.',
      status: 'error',
    });
  });

  it('propagates Next redirect control flow after successful project creation', async () => {
    const redirectSignal = createNextRedirectSignal('/dashboard/created-project-id');
    createProjectForCurrentUserMock.mockResolvedValue({ id: 'created-project-id' });
    redirectMock.mockImplementation(() => {
      throw redirectSignal;
    });

    await expect(
      createProjectAction(initialCreateProjectActionState, validProjectFormData()),
    ).rejects.toBe(redirectSignal);

    expect(redirectMock).toHaveBeenCalledWith('/dashboard/created-project-id');
    expect(createProjectForCurrentUserMock).toHaveBeenCalledTimes(1);
  });
});
