import { describe, expect, it, vi } from 'vitest';

const { createWeddingProjectMock, requireCurrentUserMock } = vi.hoisted(() => ({
  createWeddingProjectMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/projects/project.repository', () => ({
  createWeddingProject: createWeddingProjectMock,
}));

import { createProjectForCurrentUser } from '@/modules/projects/create-project.service';

describe('SRY-005 server-owned project creation service', () => {
  it('uses the authenticated user id instead of any client-controlled account identity', async () => {
    requireCurrentUserMock.mockResolvedValue({
      email: 'owner-a@example.test',
      id: '11111111-1111-1111-1111-111111111111',
      user_metadata: {},
    });
    createWeddingProjectMock.mockResolvedValue({ id: 'created-project' });

    await createProjectForCurrentUser({
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'raka-nadia',
    });

    expect(createWeddingProjectMock).toHaveBeenCalledWith({
      accountId: '11111111-1111-1111-1111-111111111111',
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'raka-nadia',
    });
  });
});
