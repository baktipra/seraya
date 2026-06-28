import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type GuestbookDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

/** Compatibility entry point. Ucapan now lives under Respons Tamu. */
export default async function GuestbookDashboardPage({ params }: GuestbookDashboardPageProps) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/rsvp?tab=ucapan`);
}
