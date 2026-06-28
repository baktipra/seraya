import { redirect } from 'next/navigation';

type SharePageProps = {
  params: Promise<{ projectId: string }>;
};

/** Compatibility route. Manual distribution now has one home: Bagikan. */
export default async function SharePage({ params }: SharePageProps) {
  const { projectId } = await params;
  redirect(`/dashboard/${projectId}/delivery`);
}
