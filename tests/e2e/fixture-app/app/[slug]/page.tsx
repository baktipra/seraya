import { notFound } from 'next/navigation';

import { InvitationTemplateRenderer } from '@/modules/invitation-templates/invitation-template-renderer';
import { createFixtureInvitation } from '@fixture/lib/fixture-invitation';
import { getFixtureTemplateKey } from '@fixture/lib/fixture-state';

type GenericFixturePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GenericFixturePage({ params }: GenericFixturePageProps) {
  const { slug } = await params;
  const templateKey = getFixtureTemplateKey(slug);

  if (!templateKey) {
    notFound();
  }

  return (
    <main className="bg-seraya-ivory min-h-screen px-0 py-0 sm:px-6 sm:py-8">
      <InvitationTemplateRenderer
        invitation={createFixtureInvitation(templateKey)}
        surface="generic"
        templateKey={templateKey}
      />
    </main>
  );
}
