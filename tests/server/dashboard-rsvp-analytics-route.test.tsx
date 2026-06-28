import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getGuestbookInboxMock,
  getOwnedProjectContextMock,
  getReadinessMock,
  getRsvpAnalyticsMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getGuestbookInboxMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  getReadinessMock: vi.fn(),
  getRsvpAnalyticsMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/guest-response-workspace', () => ({
  GuestResponseWorkspace: ({ projectId }: { projectId: string }) => (
    <div data-response-workspace-project-id={projectId}>Respons Tamu</div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/guestbook', () => ({
  getGuestbookInboxForVerifiedProject: getGuestbookInboxMock,
}));
vi.mock('@/modules/guests/rsvp-analytics.service', () => ({
  getRsvpAnalyticsForVerifiedProject: getRsvpAnalyticsMock,
}));
vi.mock('@/modules/readiness', () => ({
  getWeddingReadinessForRequest: getReadinessMock,
}));

import RsvpAnalyticsPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/rsvp/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { default_timezone: 'Asia/Jakarta', id: projectId };
const analytics = {
  activeGuestCount: 1,
  attendingCountUnknownGuestCount: 0,
  attendingGuestCount: 1,
  confirmedAttendeeCount: 1,
  declinedGuestCount: 0,
  invitedPeopleCount: 1,
  pendingGuestCount: 0,
  pendingGuests: [],
  respondedCount: 1,
  respondedPercentage: 100,
  responseRows: [],
};

function createReadiness({
  hasActivePersonalLinks = true,
  hasPublishedSnapshot = true,
}: {
  hasActivePersonalLinks?: boolean;
  hasPublishedSnapshot?: boolean;
} = {}) {
  return {
    invitation: { hasPublishedSnapshot },
    responses: { hasActivePersonalLinks },
  };
}

describe('SRY-039 private Respons Tamu route', () => {
  beforeEach(() => {
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getReadinessMock.mockReset().mockResolvedValue(createReadiness());
    getRsvpAnalyticsMock.mockReset().mockResolvedValue({ analytics, project });
    getGuestbookInboxMock.mockReset().mockResolvedValue({
      entries: [],
      project: { defaultTimezone: 'Asia/Jakarta', id: projectId },
    });
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders combined owner response workspace after personal links exist', async () => {
    const page = await RsvpAnalyticsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getReadinessMock).toHaveBeenCalledWith(projectId);
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getRsvpAnalyticsMock).toHaveBeenCalledWith(project);
    expect(getGuestbookInboxMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Respons Tamu');
    expect(html).toContain(`data-response-workspace-project-id="${projectId}"`);
  });

  it('shows a truthful unavailable state before personal invitations exist without loading response data', async () => {
    getReadinessMock.mockResolvedValue(
      createReadiness({ hasActivePersonalLinks: false, hasPublishedSnapshot: true }),
    );

    const page = await RsvpAnalyticsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Respons tamu belum tersedia');
    expect(html).toContain(`href="/dashboard/${projectId}/delivery"`);
    expect(getOwnedProjectContextMock).not.toHaveBeenCalled();
    expect(getRsvpAnalyticsMock).not.toHaveBeenCalled();
    expect(getGuestbookInboxMock).not.toHaveBeenCalled();
  });

  it('uses generic not-found behavior for foreign or deleted project access', async () => {
    getReadinessMock.mockRejectedValue(new ProjectAccessDeniedError());
    await expect(
      RsvpAnalyticsPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('uses request-local verified project context without public snapshot or mutation dependencies', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx'),
      'utf8',
    );
    expect(source).toContain('getWeddingReadinessForRequest');
    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getRsvpAnalyticsForVerifiedProject');
    expect(source).toContain('getGuestbookInboxForVerifiedProject');
    expect(source).not.toContain('getRsvpAnalyticsForCurrentUser');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('revalidateTag');
  });
});
