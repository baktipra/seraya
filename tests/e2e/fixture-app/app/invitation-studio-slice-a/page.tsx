import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';

function FixturePanel({ label }: { label: string }) {
  return (
    <div
      className="border-seraya-border-default bg-seraya-surface min-h-[32rem] rounded-[var(--seraya-radius-lg)] border p-6"
      data-fixture-panel={label.toLowerCase()}
    >
      <p className="text-seraya-text-primary text-lg font-semibold">{label}</p>
      <p className="text-seraya-text-secondary mt-2 max-w-xl text-sm leading-6">
        Panel ini mewakili behavior yang tetap mounted selama perpindahan mode Slice A.
      </p>
    </div>
  );
}

export default function InvitationStudioSliceAFixturePage() {
  return (
    <main className="bg-seraya-canvas min-h-screen px-0 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[92rem]">
        <InvitationStudioShell
          content={<FixturePanel label="Isi" />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioModePlaceholder
              description="Template dan palet mempunyai canvas sendiri."
              eyebrow="Desain"
              title="Pilih arah visual undangan."
            />
          }
          initialMode="content"
          media={<FixturePanel label="Media" />}
          preview={<FixturePanel label="Preview" />}
          previewHref="/invitation-studio-slice-a"
          publish={<FixturePanel label="Terbitkan" />}
          statusLabel="Undangan aktif"
          statusTone="success"
        />
      </div>
    </main>
  );
}
