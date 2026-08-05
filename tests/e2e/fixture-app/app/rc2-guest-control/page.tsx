import type { Route } from 'next';

import { GuestControlConfidence } from '@/components/projects/guest-control-confidence';
import { PublishedConfidence } from '@/components/projects/published-confidence';
import { CompassFocus, CompassWorkspace } from '@/components/workspace/compass-primitives';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

type GuestControlFixtureProps = {
  searchParams?: Promise<{ state?: string | string[] | undefined }>;
};

function createGuests(state: string): WeddingReadinessV1['guests'] {
  if (state === 'managed') {
    return {
      activeGuestCount: 4,
      activePersonalLinkGuestCount: 4,
      guestsWithoutActivePersonalLinkCount: 0,
      needsLinkUpdateCount: 0,
      needsWhatsAppCount: 1,
      noPersonalInvitationCount: 0,
      readyToDistributeCount: 3,
      whatsappAvailableCount: 3,
      whatsappUnavailableCount: 1,
    };
  }

  if (state === 'empty') {
    return {
      activeGuestCount: 0,
      activePersonalLinkGuestCount: 0,
      guestsWithoutActivePersonalLinkCount: 0,
      needsLinkUpdateCount: 0,
      needsWhatsAppCount: 0,
      noPersonalInvitationCount: 0,
      readyToDistributeCount: 0,
      whatsappAvailableCount: 0,
      whatsappUnavailableCount: 0,
    };
  }

  return {
    activeGuestCount: 6,
    activePersonalLinkGuestCount: 3,
    guestsWithoutActivePersonalLinkCount: 3,
    needsLinkUpdateCount: 2,
    needsWhatsAppCount: 0,
    noPersonalInvitationCount: 2,
    readyToDistributeCount: 2,
    whatsappAvailableCount: 5,
    whatsappUnavailableCount: 1,
  };
}

export default async function GuestControlFixture({ searchParams }: GuestControlFixtureProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawState = resolvedSearchParams?.state;
  const state = (Array.isArray(rawState) ? rawState[0] : rawState) ?? 'attention';

  return (
    <main className="bg-seraya-canvas min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <CompassWorkspace labelledBy="rc2-fixture-title">
          <header>
            <p className="text-seraya-text-muted text-xs font-medium">Ringkasan proyek</p>
            <h1 className="seraya-page-title mt-2" id="rc2-fixture-title">
              Raka &amp; Nadia
            </h1>
          </header>

          <PublishedConfidence hasUnpublishedChanges={false} />
          <GuestControlConfidence guests={createGuests(state)} projectId="project-id" />

          <CompassFocus
            actionLabel="Kelola tamu"
            description="Lanjutkan satu fokus operasional berdasarkan kondisi project saat ini."
            eyebrow="Operasional setelah terbit"
            href={'/rc2-guest-control/guests' as Route}
            title="Kelola tamu"
            titleId="rc2-fixture-next-step"
          />
        </CompassWorkspace>
      </div>
    </main>
  );
}
