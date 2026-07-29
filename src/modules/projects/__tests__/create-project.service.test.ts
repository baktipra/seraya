import { describe, expect, it, vi } from 'vitest';

const {
  createWeddingProjectMock,
  getActiveInvitationDraftMock,
  requireCurrentUserMock,
  updateActiveInvitationDraftMock,
} = vi.hoisted(() => ({
  createWeddingProjectMock: vi.fn(),
  getActiveInvitationDraftMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  updateActiveInvitationDraftMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/projects/project.repository', () => ({
  createWeddingProject: createWeddingProjectMock,
}));

vi.mock('@/modules/invitations/invitation-draft.repository', () => ({
  getActiveInvitationDraftForVerifiedProject: getActiveInvitationDraftMock,
  updateActiveInvitationDraftForVerifiedProject: updateActiveInvitationDraftMock,
}));

vi.mock('@/modules/invitations/invitation-draft.schema', () => ({
  invitationDraftContentSchema: {
    safeParse: vi.fn((value: unknown) => ({ data: value, success: true })),
  },
}));

import { createProjectForCurrentUser } from '@/modules/projects/create-project.service';

describe('SRY-005 server-owned project creation service', () => {
  it('uses authenticated ownership and initializes the chosen flagship collection', async () => {
    const project = { id: 'created-project' };
    const draft = {
      content: { templateKey: 'roselle' },
      id: 'created-draft',
      projectId: 'created-project',
    };

    requireCurrentUserMock.mockResolvedValue({
      email: 'owner-a@example.test',
      id: '11111111-1111-1111-1111-111111111111',
      user_metadata: {},
    });
    createWeddingProjectMock.mockResolvedValue(project);
    getActiveInvitationDraftMock.mockResolvedValue(draft);
    updateActiveInvitationDraftMock.mockResolvedValue({
      ...draft,
      content: { templateKey: 'aruna' },
    });

    await createProjectForCurrentUser({
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'raka-nadia',
      templateKey: 'aruna',
    });

    expect(createWeddingProjectMock).toHaveBeenCalledWith({
      accountId: '11111111-1111-1111-1111-111111111111',
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      personOneName: 'Raka',
      personTwoName: 'Nadia',
      slug: 'raka-nadia',
    });
    expect(getActiveInvitationDraftMock).toHaveBeenCalledWith(project);
    expect(updateActiveInvitationDraftMock).toHaveBeenCalledWith({
      content: { templateKey: 'aruna' },
      draft,
      project,
    });
  });
});
