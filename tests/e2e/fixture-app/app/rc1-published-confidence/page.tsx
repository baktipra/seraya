import type { Route } from 'next';

import { PublishedConfidence } from '@/components/projects/published-confidence';
import { CompassFocus, CompassWorkspace } from '@/components/workspace/compass-primitives';

type PublishedConfidenceFixtureProps = {
  searchParams?: Promise<{ changes?: string | string[] | undefined }>;
};

export default async function PublishedConfidenceFixture({
  searchParams,
}: PublishedConfidenceFixtureProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const hasUnpublishedChanges = resolvedSearchParams?.changes === '1';

  return (
    <main className="bg-seraya-canvas min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <CompassWorkspace labelledBy="rc1-fixture-title">
          <header>
            <p className="text-seraya-text-muted text-xs font-medium">Ringkasan proyek</p>
            <h1 className="seraya-page-title mt-2" id="rc1-fixture-title">
              Raka &amp; Nadia
            </h1>
          </header>

          <PublishedConfidence hasUnpublishedChanges={hasUnpublishedChanges} />

          <CompassFocus
            actionLabel="Kelola tamu"
            description="Undangan sudah terbit. Lanjutkan dengan menyiapkan daftar tamu untuk pembagian personal."
            eyebrow="Operasional setelah terbit"
            href={'/rc1-published-confidence/guests' as Route}
            title="Kelola tamu"
            titleId="rc1-fixture-next-step"
          />
        </CompassWorkspace>
      </div>
    </main>
  );
}
