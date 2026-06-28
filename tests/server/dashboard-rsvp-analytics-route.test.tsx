import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getGuestbookInboxMock, getOwnedProjectContextMock, getRsvpAnalyticsMock, notFoundMock } =
  vi.hoisted(() => ({
    getGuestbookInboxMock: vi.fn(),
    getOwnedProjectContextMock: vi.fn(),
    getRsvpAnalyticsMock: vi.fn(),
    notFoundMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/guest-response-workspace', () => ({
  GuestResponseWorkspace: ({
    initialTab,
    projectId,
  }: {
    initialTab?: string;
    projectId: string;
  }) => (
    <div data-response-workspace-project-id={projectId} data-response-workspace-tab={initialTab}>
      Respons Tamu
    </div>
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

import RsvpAnalyticsPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/rsvp/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { default_timezone: 'Asia/Jakarta', id: projectId };
const analytics = {
  activeGuestCount: 0,
  attendingCountUnknownGuestCount: 0,
  attendingGuestCount: 0,
  confirmedAttendeeCount: 0,
  declinedGuestCount: 0,
  invitedPeopleCount: 0,
  pendingGuestCount: 0,
  pendingGuests: [],
  respondedCount: 0,
  respondedPercentage: 0,
  responseRows: [],
};

describe('SRY-040 private Respons Tamu route', () => {
  beforeEach(() => {
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
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

  it('is private dynamic no-store and loads the canonical response hub even before invitations are prepared', async () => {
    const page = await RsvpAnalyticsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getRsvpAnalyticsMock).toHaveBeenCalledWith(project);
    expect(getGuestbookInboxMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Respons Tamu');
    expect(html).toContain(`data-response-workspace-project-id="${projectId}"`);
  });

  it('opens the compatible Ucapan tab from query state', async () => {
    const page = await RsvpAnalyticsPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({ tab: 'ucapan' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-response-workspace-tab="guestbook"');
  });

  it('uses generic not-found behavior for foreign or deleted project access', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      RsvpAnalyticsPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getRsvpAnalyticsMock).not.toHaveBeenCalled();
    expect(getGuestbookInboxMock).not.toHaveBeenCalled();
  });

  it('uses request-local verified project context without readiness, public snapshot, or mutation dependencies', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx'),
      'utf8',
    );
    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getRsvpAnalyticsForVerifiedProject');
    expect(source).toContain('getGuestbookInboxForVerifiedProject');
    expect(source).not.toContain('getWeddingReadinessForRequest');
    expect(source).not.toContain('getRsvpAnalyticsForCurrentUser');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('revalidateTag');
  });
});
