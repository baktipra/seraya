import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getOwnedProjectContextMock, getReadinessMock, getRsvpAnalyticsMock, notFoundMock } =
  vi.hoisted(() => ({
    getOwnedProjectContextMock: vi.fn(),
    getReadinessMock: vi.fn(),
    getRsvpAnalyticsMock: vi.fn(),
    notFoundMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/rsvp-analytics-dashboard', () => ({
  RsvpAnalyticsDashboard: ({ projectId }: { projectId: string }) => (
    <div data-rsvp-analytics-project-id={projectId}>Ringkasan RSVP</div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
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
const project = { id: projectId };

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

describe('SRY-031 private RSVP analytics route', () => {
  beforeEach(() => {
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getReadinessMock.mockReset().mockResolvedValue(createReadiness());
    getRsvpAnalyticsMock.mockReset();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders only verified owner analytics after active personal links exist', async () => {
    getRsvpAnalyticsMock.mockResolvedValue({ analytics, project });

    const page = await RsvpAnalyticsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getReadinessMock).toHaveBeenCalledWith(projectId);
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getRsvpAnalyticsMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Ringkasan RSVP');
    expect(html).toContain(`data-rsvp-analytics-project-id="${projectId}"`);
  });

  it('shows a truthful unavailable state before personal invitations exist without loading analytics', async () => {
    getReadinessMock.mockResolvedValue(
      createReadiness({ hasActivePersonalLinks: false, hasPublishedSnapshot: true }),
    );

    const page = await RsvpAnalyticsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Respons tamu belum tersedia');
    expect(html).toContain('Status RSVP akan muncul setelah undangan pribadi mulai disiapkan.');
    expect(html).toContain(`href="/dashboard/${projectId}/delivery"`);
    expect(getOwnedProjectContextMock).not.toHaveBeenCalled();
    expect(getRsvpAnalyticsMock).not.toHaveBeenCalled();
  });

  it('uses the same unavailable route state for foreign or deleted project access', async () => {
    getReadinessMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      RsvpAnalyticsPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('uses request-local verified project context without public snapshot, cookie, Host-derived, or mutation dependencies', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getWeddingReadinessForRequest');
    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getRsvpAnalyticsForVerifiedProject');
    expect(source).not.toContain('getRsvpAnalyticsForCurrentUser');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('headers(');
    expect(source).not.toContain('publications');
    expect(source).not.toContain('revalidateTag');
  });
});
