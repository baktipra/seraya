'use client';

import { InvitationStudioProvider, type InvitationStudioSaveAction } from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationTaskWorkspace } from '../../../../../src/components/projects/invitation-task-workspace';
import type { InvitationWorkspaceTask } from '../../../../../src/components/projects/invitation-task-workspace.types';
import { ToastProvider } from '../../../../../src/design-system';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { InvitationReadinessV1 } from '../../../../../src/modules/readiness';

const fixtureSaveAction: InvitationStudioSaveAction = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  return { message: 'Draf task workspace sudah disimpan.', status: 'success' };
};

function FixtureTask({ label }: { label: string }) {
  return (
    <section
      className="border-seraya-border-default bg-seraya-surface min-h-[32rem] rounded-[var(--seraya-radius-lg)] border p-8"
      data-fixture-task={label.toLowerCase()}
    >
      <p className="seraya-eyebrow text-seraya-action-primary">Fixture task</p>
      <h2 className="text-seraya-text-primary mt-3 font-serif text-4xl">{label}</h2>
      <p className="text-seraya-text-secondary mt-4 max-w-xl leading-7">
        Panel ini mewakili authority lama yang tetap dipakai di balik task workspace baru.
      </p>
    </section>
  );
}

type OwnerWorkspaceUsabilityResetFixtureProps = {
  initialTask: InvitationWorkspaceTask | null;
  readiness: InvitationReadinessV1;
  savedDraft: InvitationDraft;
};

export function OwnerWorkspaceUsabilityResetFixture({
  initialTask,
  readiness,
  savedDraft,
}: OwnerWorkspaceUsabilityResetFixtureProps) {
  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={savedDraft}
        projectId="usability-reset-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationTaskWorkspace
          coupleLabel={readiness.identity.coupleLabel}
          design={<FixtureTask label="Tema & warna" />}
          draft={savedDraft}
          initialTask={initialTask}
          media={<FixtureTask label="Galeri & musik" />}
          preview={<FixtureTask label="Preview" />}
          projectId="usability-reset-project"
          publish={<FixtureTask label="Terbitkan" />}
          readiness={readiness}
          statusLabel="Draf belum lengkap"
          statusTone="neutral"
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
