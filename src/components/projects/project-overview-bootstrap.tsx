import Link from 'next/link';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import { PaymentActivationControls } from '@/components/projects/payment-activation-controls';
import type { PaymentOverview } from '@/modules/payments/payment.types';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import {
  formatProjectEventDate,
  getProjectCoupleLabel,
  getProjectStatusLabel,
} from '@/modules/projects/project.mapper';
import type { OwnedProject } from '@/modules/projects/project.repository';

import { PublishInvitationControls } from './publish-invitation-controls';

type ProjectOverviewBootstrapProps = {
  draft: InvitationDraft | null;
  guestCount?: number;
  publication: PublishedInvitationSnapshot | null;
  project: OwnedProject;
  paymentOverview: PaymentOverview;
};

type ReadinessItem = {
  complete: boolean;
  label: string;
};

function ReadinessMark({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        complete
          ? 'text-seraya-status-success text-base font-semibold'
          : 'text-seraya-text-muted text-base font-semibold'
      }
    >
      {complete ? '✓' : '○'}
    </span>
  );
}

export function ProjectOverviewBootstrap({
  draft,
  guestCount = 0,
  publication,
  project,
  paymentOverview,
}: ProjectOverviewBootstrapProps) {
  const coupleLabel = getProjectCoupleLabel(project.person_one_name, project.person_two_name);
  const isPublished = Boolean(publication && project.status === 'published');
  const readinessItems: ReadinessItem[] = [
    {
      complete: Boolean(
        project.person_one_name &&
        project.person_two_name &&
        draft?.content.couple.personOne.displayName &&
        draft?.content.couple.personTwo.displayName,
      ),
      label: 'Nama pasangan',
    },
    {
      complete: Boolean(project.event_date_primary && draft?.content.events.primaryDate),
      label: 'Tanggal acara',
    },
    {
      complete: Boolean(project.event_city),
      label: 'Kota acara',
    },
    { complete: false, label: 'Detail acara' },
    { complete: false, label: 'Lokasi' },
    { complete: false, label: 'Cerita kalian' },
    { complete: Boolean(draft?.content.gallery.imageIds.length), label: 'Foto' },
  ];

  return (
    <Card aria-labelledby="project-overview-title" className="max-w-3xl overflow-hidden">
      <div className="bg-seraya-brand-soft px-5 py-7 sm:px-8 sm:py-9">
        <Badge variant={isPublished ? 'success' : 'brand'}>
          {getProjectStatusLabel(project.status)}
        </Badge>
        <p className="text-seraya-text-secondary mt-5 text-sm font-semibold">{coupleLabel}</p>
        <h1
          className="seraya-display-md mt-3 max-w-2xl text-[clamp(2.25rem,5vw,3.5rem)]"
          id="project-overview-title"
        >
          {isPublished ? 'Undangan kalian sudah dipublikasikan.' : 'Undangan kalian sudah dibuat.'}
        </h1>
        <p className="text-seraya-text-secondary mt-4 max-w-xl text-base leading-7">
          {isPublished
            ? 'Link undangan kalian sudah aktif. Perubahan draft berikutnya baru terlihat publik setelah diterbitkan lagi.'
            : draft
              ? 'Detail dasar undangan sudah siap. Selanjutnya kalian akan bisa melengkapi cerita, acara, lokasi, dan tampilan undangan.'
              : 'Detail dasar project sudah tersimpan, tetapi draft undangan belum tersedia. Muat ulang halaman ini beberapa saat lagi.'}
        </p>
      </div>

      <CardHeader>
        <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
          Ringkasan awal
        </CardTitle>
        <CardDescription>
          {draft
            ? 'Data dasar ini sudah menjadi fondasi draft undangan kalian.'
            : 'Data project tersimpan, tetapi draft undangan belum ditemukan. Muat ulang halaman ini untuk mencoba lagi.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-5 sm:pt-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
              Pasangan
            </dt>
            <dd className="text-seraya-text-primary mt-2 text-base font-semibold">{coupleLabel}</dd>
          </div>
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
              Tanggal acara
            </dt>
            <dd className="text-seraya-text-primary mt-2 text-base font-semibold">
              {formatProjectEventDate(project.event_date_primary)}
            </dd>
          </div>
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
              Kota acara
            </dt>
            <dd className="text-seraya-text-primary mt-2 text-base font-semibold">
              {project.event_city}
            </dd>
          </div>
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
              Tautan undangan
            </dt>
            <dd className="text-seraya-text-primary mt-2 text-base font-semibold break-all">
              /{project.slug}
            </dd>
          </div>
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
            <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
              Tamu
            </dt>
            <dd className="text-seraya-text-primary mt-2 text-base font-semibold">
              {guestCount} tamu tersimpan
            </dd>
          </div>
        </dl>

        <section aria-labelledby="invitation-readiness-title" className="space-y-3">
          <div>
            <h2
              className="text-seraya-text-primary text-base font-semibold"
              id="invitation-readiness-title"
            >
              Kesiapan isi undangan
            </h2>
            <p className="text-seraya-text-muted mt-1 text-sm leading-6">
              Checklist ini hanya memakai data project dan draft yang sudah tersimpan.
            </p>
          </div>
          <ul className="border-seraya-border-default grid gap-x-5 gap-y-2 rounded-[var(--seraya-radius-md)] border p-4 sm:grid-cols-2">
            {readinessItems.map((item) => (
              <li
                className="text-seraya-text-secondary flex items-center gap-2 text-sm"
                key={item.label}
              >
                <ReadinessMark complete={item.complete} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="border-seraya-border-default flex flex-wrap items-center gap-3 border-t pt-5">
          {draft ? (
            <>
              <form action={`/dashboard/${project.id}/preview`} method="get">
                <Button size="lg" type="submit" variant="secondary">
                  Pratinjau undangan
                </Button>
              </form>
              <Link
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] border px-5 text-base font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={`/dashboard/${project.id}/gallery`}
              >
                Kelola galeri
              </Link>
              <Link
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-seraya-focus-ring inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] border px-5 text-base font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={`/dashboard/${project.id}/guests`}
              >
                Kelola tamu
              </Link>
            </>
          ) : null}
          {draft ? (
            <Link
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-base font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`/dashboard/${project.id}/invitation`}
            >
              Edit undangan
            </Link>
          ) : null}
        </div>

        {project.status !== 'published' ? (
          <div className="border-seraya-border-default border-t pt-5">
            <PaymentActivationControls overview={paymentOverview} projectId={project.id} />
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-4 inline-flex rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${project.id}/billing`}
            >
              Lihat tagihan
            </Link>
          </div>
        ) : null}

        <div className="border-seraya-border-default border-t pt-5">
          <PublishInvitationControls
            hasActiveDraft={Boolean(draft)}
            projectId={project.id}
            publishedSlug={publication?.slug ?? null}
            publishEligibility={paymentOverview.publishEligibility}
          />
        </div>
      </CardContent>
    </Card>
  );
}
