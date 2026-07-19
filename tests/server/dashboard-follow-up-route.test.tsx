import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getCenterMock, getOwnedProjectContextMock, notFoundMock, prepareHandoffActionMock } =
  vi.hoisted(() => ({
    getCenterMock: vi.fn(),
    getOwnedProjectContextMock: vi.fn(),
    notFoundMock: vi.fn(),
    prepareHandoffActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/guest-follow-up-center', () => ({
  GuestFollowUpCenter: ({
    isPublished,
    projectId,
    rows,
  }: {
    isPublished: boolean;
    projectId: string;
    rows: Array<{ handoffAction?: unknown }>;
  }) => (
    <div
      data-action-row-count={rows.filter((row) => row.handoffAction).length}
      data-follow-up-project-id={projectId}
      data-published={String(isPublished)}
    >
      Tindak lanjut tamu
    </div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/follow-up/follow-up.actions', () => ({
  prepareGuestFollowUpHandoffAction: prepareHandoffActionMock,
}));
vi.mock('@/modules/follow-up/follow-up.service', () => ({
  getGuestFollowUpCenterForVerifiedProject: getCenterMock,
}));

import GuestFollowUpPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/follow-up/page';

const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const project = { default_timezone: 'Asia/Jakarta', id: projectId };

function row(eligible = true) {
  return {
    displayName: 'Keluarga Budi',
    eligibility: {
      canPrepareEventReminder: false,
      canPrepareInitialInvitation: eligible,
      canPrepareRsvpReminder: false,
    },
    followUpCount: 0,
    followUpSegment: 'no_follow_up_recorded' as const,
    groupLabel: null,
    guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    lastFollowUpAt: null,
    lastMessageKind: null,
    maskedWhatsAppNumber: '+62••••7890',
    personalLinkReaccessState: 'recoverable' as const,
    personalLinkState: 'active' as const,
    rsvpStatus: 'pending' as const,
    whatsappAvailability: 'available' as const,
  };
}

const summary = {
  activeGuestCount: 1,
  awaitingRsvpCount: 0,
  needsDataRepairCount: 0,
  needsLinkUpdateCount: 0,
  needsPreparationCount: 0,
  needsWhatsAppCount: 0,
  noFollowUpRecordedCount: 1,
  noPersonalInvitationCount: 0,
  rsvpRespondedCount: 0,
};

describe('Guest Follow-up Slice D private workspace route', () => {
  beforeEach(() => {
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getCenterMock.mockReset().mockResolvedValue({
      isPublished: true,
      project,
      rows: [row(), row(false)],
      summary,
    });
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store, composes the verified read model, and binds actions only for eligible rows', async () => {
    const page = await GuestFollowUpPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getCenterMock).toHaveBeenCalledWith(project);
    expect(html).toContain(`data-follow-up-project-id="${projectId}"`);
    expect(html).toContain('data-published="true"');
    expect(html).toContain('data-action-row-count="1"');
  });

  it('keeps the workspace available before publication while the component owns the unpublished state', async () => {
    getCenterMock.mockResolvedValue({
      isPublished: false,
      project,
      rows: [row()],
      summary,
    });

    const page = await GuestFollowUpPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-published="false"');
    expect(getCenterMock).toHaveBeenCalledWith(project);
  });

  it('uses generic not-found behavior for foreign or deleted projects', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      GuestFollowUpPage({ params: Promise.resolve({ projectId: 'project-foreign' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getCenterMock).not.toHaveBeenCalled();
  });

  it('uses only request-local owner context, the Slice B center, and the Slice C action authority', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/follow-up/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getGuestFollowUpCenterForVerifiedProject');
    expect(source).toContain('prepareGuestFollowUpHandoffAction.bind');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('createAdminSupabaseClient');
    expect(source).not.toContain('getWeddingReadinessForRequest');
    expect(source).not.toContain('published_invitation_snapshots');
    expect(source).not.toContain('whatsapp_phone_e164');
  });
});
