import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardProjectLauncher } from '@/components/dashboard/dashboard-project-launcher';
import { ProfileRecoveryNotice } from '@/components/dashboard/profile-recovery-notice';
import { getDashboardSessionContext } from '@/modules/auth/dashboard-session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const context = await getDashboardSessionContext();

  return (
    <div className="space-y-6">
      {context.profileUnavailable ? <ProfileRecoveryNotice /> : null}
      {context.projects.length > 0 ? (
        <DashboardProjectLauncher projects={context.projects} />
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  );
}
