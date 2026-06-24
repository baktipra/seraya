import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getOwnedProjectContextMock, getRsvpAnalyticsMock, notFoundMock } = vi.hoisted(() => ({
  getOwnedProjectContextMock: vi.fn(),
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

import RsvpAnalyticsPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/rsvp/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { id: projectId };

describe('SRY-020 private RSVP analytics route', () => {
  beforeEach(() => {
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getRsvpAnalyticsMock.mockReset();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders only verified owner analytics', async () => {
    getRsvpAnalyticsMock.mockResolvedValue({
      analytics: {
        activeGuestCount: 1,
        attendingCount: 1,
        declinedCount: 0,
        pendingCount: 0,
        pendingGuests: [],
        respondedCount: 1,
        respondedPercentage: 100,
      },
      project,
    });

    const page = await RsvpAnalyticsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getRsvpAnalyticsMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Ringkasan RSVP');
    expect(html).toContain(`data-rsvp-analytics-project-id="${projectId}"`);
  });

  it('uses the same unavailable route state for foreign or deleted project access', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      RsvpAnalyticsPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('uses the request-local verified project context without public snapshot, cookie, Host-derived, or mutation dependencies', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx'),
      'utf8',
    );

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
