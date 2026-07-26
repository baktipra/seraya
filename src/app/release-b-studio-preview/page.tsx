import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InvitationEditor } from '@/components/projects/invitation-editor';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

export const metadata: Metadata = {
  title: 'Release B studio preview',
  robots: {
    follow: false,
    index: false,
  },
};

const showroomProject = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Bandung',
  event_date_primary: '2027-08-17',
  id: 'release-b-studio-preview',
  person_one_name: 'Mira',
  person_two_name: 'Arga',
  slug: 'mira-arga',
  status: 'draft',
};

const baseContent = createDefaultInvitationDraftContent(showroomProject);
const showroomDraft: InvitationDraft = {
  content: {
    ...baseContent,
    hero: {
      eyebrow: 'The Wedding of',
      subtitle: 'Dengan hangat kami mengundang Anda untuk merayakan hari pernikahan kami.',
      title: 'Mira & Arga',
    },
    story: {
      body: 'Sebuah pertemuan sederhana tumbuh menjadi perjalanan yang ingin kami lanjutkan bersama.',
      enabled: true,
      heading: 'Cerita kami',
    },
  },
  created_at: '2026-07-26T00:00:00.000Z',
  deleted_at: null,
  id: 'release-b-studio-draft',
  project_id: showroomProject.id,
  schema_version: 1,
  updated_at: '2026-07-26T00:00:00.000Z',
};

export default function ReleaseBStudioPreviewPage() {
  if (process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  return (
    <div className="bg-seraya-canvas min-h-screen">
      <header className="border-seraya-border-default bg-seraya-ink border-b text-white">
        <div className="mx-auto flex min-h-14 max-w-[96rem] flex-col justify-center gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase">
            Release B studio showroom
          </p>
          <p className="text-xs text-white/65">
            Data fiktif · preview-only · jangan submit · 404 di production
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="mb-7 max-w-3xl" aria-labelledby="release-b-showroom-title">
          <p className="seraya-eyebrow text-seraya-action-primary">Create-to-publish journey</p>
          <h1
            className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.5rem,5vw,4.75rem)] leading-[0.9] font-medium tracking-[-0.045em]"
            id="release-b-showroom-title"
          >
            Studio undangan yang membedakan edit, simpan, dan terbit.
          </h1>
          <p className="text-seraya-text-secondary mt-5 max-w-2xl text-base leading-7">
            Coba berpindah chapter, mengubah teks, membuka pratinjau publik atau personal, serta
            mengganti viewport. Showroom memakai komponen editor produksi tetapi tidak memiliki sesi
            owner atau persistence.
          </p>
        </section>

        <InvitationEditor
          draft={showroomDraft}
          galleryImages={[]}
          project={{ event_date_primary: showroomProject.event_date_primary }}
          projectId={showroomProject.id}
        />
      </main>
    </div>
  );
}
