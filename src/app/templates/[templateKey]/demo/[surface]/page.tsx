import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  INVITATION_TEMPLATE_KEYS,
  InvitationTemplateRenderer,
  isInvitationTemplateKey,
  type InvitationTemplateKey,
} from '@/modules/invitation-templates';
import {
  CANONICAL_SHOWROOM_COUPLE,
  createCanonicalShowroomInvitation,
  createCanonicalShowroomPersonalSlots,
} from '@/modules/invitation-templates/showroom/canonical-showroom-invitation';

export const dynamic = 'force-static';
export const revalidate = 3600;

const SHOWROOM_SURFACES = ['generic', 'personal'] as const;
type ShowroomSurface = (typeof SHOWROOM_SURFACES)[number];

type ShowroomPageProps = {
  params: Promise<{
    surface: string;
    templateKey: string;
  }>;
};

function isShowroomSurface(value: unknown): value is ShowroomSurface {
  return typeof value === 'string' && SHOWROOM_SURFACES.includes(value as ShowroomSurface);
}

function getTemplateLabel(templateKey: InvitationTemplateKey) {
  return templateKey.charAt(0).toUpperCase() + templateKey.slice(1);
}

function getDemoHref(templateKey: InvitationTemplateKey, surface: ShowroomSurface): Route {
  return `/templates/${templateKey}/demo/${surface}` as Route;
}

export function generateStaticParams() {
  return INVITATION_TEMPLATE_KEYS.flatMap((templateKey) =>
    SHOWROOM_SURFACES.map((surface) => ({ surface, templateKey })),
  );
}

export async function generateMetadata({ params }: ShowroomPageProps): Promise<Metadata> {
  const { surface, templateKey } = await params;

  if (!isInvitationTemplateKey(templateKey) || !isShowroomSurface(surface)) {
    return {
      robots: { follow: false, index: false, noarchive: true },
    };
  }

  const surfaceLabel = surface === 'personal' ? 'personal' : 'umum';

  return {
    description: `Showroom statis ${getTemplateLabel(templateKey)} dengan undangan demo ${surfaceLabel} Kirana dan Arga.`,
    robots: { follow: false, index: false, noarchive: true },
    title: `${getTemplateLabel(templateKey)} — Demo ${surfaceLabel}`,
  };
}

export default async function CanonicalShowroomDemoPage({ params }: ShowroomPageProps) {
  const { surface, templateKey } = await params;

  if (!isInvitationTemplateKey(templateKey) || !isShowroomSurface(surface)) {
    notFound();
  }

  const invitation = createCanonicalShowroomInvitation(templateKey);
  const personalSlots = surface === 'personal' ? createCanonicalShowroomPersonalSlots() : undefined;
  const templateLabel = getTemplateLabel(templateKey);

  return (
    <div className="bg-seraya-canvas min-h-screen">
      <header className="border-seraya-border-default bg-seraya-canvas/95 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[90rem] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-10">
          <div>
            <Link
              className="text-seraya-text-primary font-serif text-2xl font-medium tracking-[-0.04em]"
              href="/templates"
            >
              ← Koleksi Seraya
            </Link>
            <p className="text-seraya-text-muted mt-1 text-xs font-semibold tracking-[0.1em] uppercase">
              {templateLabel} · {CANONICAL_SHOWROOM_COUPLE.displayName}
            </p>
          </div>

          <nav aria-label="Pilih permukaan demo" className="flex items-center gap-2">
            <Link
              aria-current={surface === 'generic' ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                surface === 'generic'
                  ? 'bg-seraya-ink text-white'
                  : 'border-seraya-border-default bg-seraya-surface text-seraya-text-primary border'
              }`}
              href={getDemoHref(templateKey, 'generic')}
            >
              Undangan umum
            </Link>
            <Link
              aria-current={surface === 'personal' ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                surface === 'personal'
                  ? 'bg-seraya-ink text-white'
                  : 'border-seraya-border-default bg-seraya-surface text-seraya-text-primary border'
              }`}
              href={getDemoHref(templateKey, 'personal')}
            >
              Undangan personal
            </Link>
          </nav>
        </div>
        {surface === 'personal' ? (
          <p className="bg-seraya-soft text-seraya-text-secondary border-seraya-border-default border-t px-5 py-2 text-center text-xs leading-5 sm:px-8">
            Simulasi personal ini memakai data fiktif dan tidak menyimpan RSVP maupun ucapan.
          </p>
        ) : null}
      </header>

      <main
        className="bg-seraya-ivory min-h-screen px-0 py-0 sm:px-6 sm:py-8"
        id="showroom-invitation"
      >
        <InvitationTemplateRenderer
          invitation={invitation}
          personalSlots={personalSlots}
          surface={surface}
          templateKey={templateKey}
        />
      </main>
    </div>
  );
}
