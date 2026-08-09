import { redirect } from 'next/navigation';

type GuestFollowUpPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/** Compatibility route. Tindak Lanjut is subordinate to the canonical Bagikan authority. */
export default async function GuestFollowUpPage({ params }: GuestFollowUpPageProps) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/delivery?view=follow-up`);
}
