import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GuestResponseWorkspace } from '@/components/projects/guest-response-workspace';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getGuestbookInboxForVerifiedProject } from '@/modules/guestbook';
import { getRsvpAnalyticsForVerifiedProject } from '@/modules/guests/rsvp-analytics.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type RsvpAnalyticsPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
};

type ResponseScreen = {
  guestbook: Awaited<ReturnType<typeof getGuestbookInboxForVerifiedProject>>;
  rsvp: Awaited<ReturnType<typeof getRsvpAnalyticsForVerifiedProject>>;
};

// Current response state is private owner data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Canonical owner response hub. It stays available before any personal invitation
 * is prepared so the truthful no-guest and no-response states can be monitored.
 */
async function getResponseScreenOrNotFound(projectId: string): Promise<ResponseScreen> {
  return measureWorkspaceServerLoad(
    {
      operation: 'guest-response-screen',
      workspace: 'responses',
    },
    async () => {
      try {
        const project = await getOwnedProjectContextForRequest(projectId);
        const [rsvp, guestbook] = await Promise.all([
          getRsvpAnalyticsForVerifiedProject(project),
          getGuestbookInboxForVerifiedProject(project),
        ]);

        return { guestbook, rsvp };
      } catch (error) {
        if (error instanceof ProjectAccessDeniedError) {
          notFound();
        }

        throw error;
      }
    },
  );
}

export default async function RsvpAnalyticsPage({ params, searchParams }: RsvpAnalyticsPageProps) {
  const { projectId } = await params;
  const { tab } = await (searchParams ?? Promise.resolve<{ tab?: string | string[] }>({}));
  const screen = await getResponseScreenOrNotFound(projectId);

  return (
    <WorkspacePage kind="responses" width="operations">
      {screen.rsvp.analytics.pendingGuestCount > 0 ? (
        <aside
          className="border-seraya-border-default bg-seraya-brand-soft mb-5 flex flex-col gap-2 rounded-[var(--seraya-radius-md)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          data-response-to-follow-up-handoff
        >
          <div>
            <p className="text-seraya-text-primary text-sm font-semibold">
              Ada tamu yang belum merespons.
            </p>
            <p className="text-seraya-text-secondary mt-1 text-xs leading-5">
              Untuk tamu yang sudah masuk tahap handoff, siapkan pengingat manual dari Bagikan.
            </p>
          </div>
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 shrink-0 items-center text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${screen.rsvp.project.id}/delivery?view=follow-up&filter=awaiting_rsvp`}
          >
            Buka Tindak Lanjut →
          </Link>
        </aside>
      ) : null}

      <GuestResponseWorkspace
        analytics={screen.rsvp.analytics}
        entries={screen.guestbook.entries}
        initialTab={tab === 'ucapan' ? 'guestbook' : 'responses'}
        projectId={screen.rsvp.project.id}
        timezone={screen.guestbook.project.defaultTimezone}
      />
    </WorkspacePage>
  );
}
