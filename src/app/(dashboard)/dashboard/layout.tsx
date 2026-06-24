import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getDashboardSessionContextForRequest } from '@/modules/auth/dashboard-session';

export const dynamic = 'force-dynamic';

async function getDashboardContextOrRedirect() {
  try {
    return await getDashboardSessionContextForRequest();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect('/login?next=/dashboard');
    }

    throw error;
  }
}

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await getDashboardContextOrRedirect();

  return (
    <DashboardShell
      displayName={context.profile?.display_name}
      email={context.profile?.email ?? context.user.email}
      hasActiveProject={context.hasActiveProject}
    >
      {children}
    </DashboardShell>
  );
}
