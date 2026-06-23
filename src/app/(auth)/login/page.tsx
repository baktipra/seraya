import { LoginForm } from '@/components/auth/login-form';
import { getLoginNotice } from '@/modules/auth/auth-feedback';
import { getSafeDashboardPath } from '@/modules/auth/redirects';

export const dynamic = 'force-dynamic';

type LoginPageProps = {
  searchParams: Promise<{ next?: string; notice?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      initialNotice={getLoginNotice(params.notice)}
      nextPath={getSafeDashboardPath(params.next)}
    />
  );
}
