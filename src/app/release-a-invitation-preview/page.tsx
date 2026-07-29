import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  InvitationTemplateRenderer,
  type InvitationViewModel,
} from '@/modules/invitation-templates';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';

export const metadata: Metadata = {
  title: 'Invitation experience preview',
  robots: {
    follow: false,
    index: false,
  },
};

const templateKeys = ['roselle', 'aruna', 'laras'] as const;
const surfaces = ['generic', 'personal'] as const;

type PreviewSurface = (typeof surfaces)[number];

type InvitationPreviewPageProps = {
  searchParams?: Promise<{
    surface?: string | string[] | undefined;
    template?: string | string[] | undefined;
  }>;
};

function isTemplateKey(value: string | undefined): value is InvitationTemplateKey {
  return templateKeys.some((key) => key === value);
}

function isPreviewSurface(value: string | undefined): value is PreviewSurface {
  return surfaces.some((surface) => surface === value);
}

function createPreviewImage(id: string, label: string, background: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125" viewBox="0 0 900 1125"><rect width="900" height="1125" fill="${background}"/><circle cx="720" cy="210" r="180" fill="rgba(255,255,255,.22)"/><path d="M0 860 C260 690 420 990 900 720 V1125 H0Z" fill="rgba(255,255,255,.18)"/><text x="70" y="1010" fill="white" font-family="Georgia, serif" font-size="58">${label}</text></svg>`;

  return {
    alt: `Foto fiktif ${label} untuk showroom Seraya`,
    id,
    src: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
}

const previewInvitation: InvitationViewModel = {
  closing: {
    message: 'Terima kasih telah menyertai kabar bahagia kami. Sampai berjumpa di hari pernikahan.',
    signature: 'Mira & Arga',
  },
  couple: {
    personOne: {
      displayName: 'Mira',
      fullName: 'Mira Azzahra Putri',
      parentLine: 'Putri dari Bapak Surya & Ibu Lestari',
    },
    personTwo: {
      displayName: 'Arga',
      fullName: 'Arga Pradana Wijaya',
      parentLine: 'Putra dari Bapak Hendra & Ibu Ratna',
    },
  },
  digitalGift: {
    accounts: [
      {
        accountHolder: 'Mira Azzahra Putri',
        accountNumber: '1234567890',
        id: '00000000-0000-4000-8000-000000000301',
        providerName: 'Bank Central Asia',
      },
    ],
    heading: 'Tanda kasih untuk perjalanan baru',
    lead: 'Kehadiran dan doa Anda adalah hadiah terindah. Bila berkenan, tanda kasih dapat disampaikan melalui rekening berikut.',
  },
  events: {
    items: [
      {
        address: 'Jl. Taman Wijaya Kusuma, Jakarta Pusat',
        dateLabel: 'Selasa, 17 Agustus 2027',
        mapsHref: 'https://maps.google.com/?q=Masjid+Istiqlal+Jakarta',
        timeLabel: '08.00–10.00',
        title: 'Akad Nikah',
        venueName: 'Masjid Istiqlal',
      },
      {
        address: 'Jl. Gatot Subroto, Jakarta Pusat',
        dateLabel: 'Selasa, 17 Agustus 2027',
        mapsHref: 'https://maps.google.com/?q=Jakarta+Convention+Center',
        timeLabel: '18.00–20.00',
        title: 'Resepsi',
        venueName: 'Jakarta Convention Center',
      },
    ],
    primaryDateLabel: 'Selasa, 17 Agustus 2027',
  },
  gallery: {
    images: [
      createPreviewImage('00000000-0000-4000-8000-000000000101', 'Persiapan', '#9a626c'),
      createPreviewImage('00000000-0000-4000-8000-000000000102', 'Pertemuan', '#67746c'),
      createPreviewImage('00000000-0000-4000-8000-000000000103', 'Perjalanan', '#a66e55'),
      createPreviewImage('00000000-0000-4000-8000-000000000104', 'Hari Bahagia', '#59475f'),
    ],
  },
  hero: {
    eyebrow: 'The Wedding Of',
    primaryDateLabel: 'Selasa, 17 Agustus 2027',
    subtitle:
      'Dengan penuh syukur, kami mengundang Anda untuk menjadi bagian dari perjalanan baru kami.',
    title: 'Mira & Arga',
  },
  location: null,
  rsvp: {
    heading: 'Konfirmasi Kehadiran',
    lead: 'Kami menantikan kabar Anda.',
  },
  story: {
    body: 'Berawal dari pertemuan sederhana, kami tumbuh bersama dan belajar bahwa rumah dapat ditemukan dalam satu sama lain.',
    heading: 'Cerita yang membawa kami ke sini',
  },
};

function PreviewGreeting() {
  return (
    <section aria-labelledby="preview-personal-greeting-title" data-personal-guest-greeting>
      <p data-personal-greeting-eyebrow>Untuk tamu terkasih</p>
      <h2 data-personal-greeting-title id="preview-personal-greeting-title">
        Yth. Bapak/Ibu/Saudara Tamu Seraya
      </h2>
      <p data-personal-greeting-lead>
        Dengan penuh sukacita, kami mengundang Anda untuk hadir dan berbagi kebahagiaan di hari
        pernikahan kami.
      </p>
    </section>
  );
}

function PreviewRsvp() {
  return (
    <section aria-labelledby="preview-rsvp-title" data-personal-guest-rsvp>
      <p data-personal-response-eyebrow>Konfirmasi kehadiran</p>
      <h2 data-personal-response-title id="preview-rsvp-title">
        Konfirmasi Kehadiran
      </h2>
      <p data-personal-response-copy>
        Apakah Anda dapat hadir? Status saat ini:{' '}
        <span data-personal-response-status>Belum merespons</span>
      </p>
      <p data-personal-response-copy>Undangan ini berlaku untuk maksimal 4 orang.</p>
      <p data-personal-response-notice role="status">
        Pilih status kehadiran sebelum menyimpan konfirmasi.
      </p>
      <div data-personal-response-form>
        <fieldset data-personal-rsvp-choices>
          <legend className="sr-only">Pilih status kehadiran</legend>
          <label data-personal-rsvp-choice data-selected="false">
            <input className="sr-only" name="preview-status" type="radio" />
            Hadir
          </label>
          <label data-personal-rsvp-choice data-selected="false">
            <input className="sr-only" name="preview-status" type="radio" />
            Tidak hadir
          </label>
        </fieldset>
        <button data-personal-response-submit disabled type="button">
          Simpan konfirmasi
        </button>
      </div>
    </section>
  );
}

function PreviewGuestbook() {
  return (
    <section aria-labelledby="preview-guestbook-title" data-personal-guestbook>
      <p data-personal-response-eyebrow>Ucapan</p>
      <h2 data-personal-response-title id="preview-guestbook-title">
        Titipkan doa terbaik
      </h2>
      <p data-personal-guestbook-help>
        Tuliskan ucapan dan doa untuk perjalanan baru kedua mempelai.
      </p>
      <div data-personal-response-form>
        <label data-personal-guestbook-field>
          <span>Ucapan &amp; doa</span>
          <textarea
            defaultValue="Semoga perjalanan kalian selalu hangat dan penuh kebahagiaan."
            readOnly
          />
        </label>
        <button data-personal-response-submit type="button">
          Kirim ucapan
        </button>
      </div>
    </section>
  );
}

function PreviewLink({
  active,
  children,
  surface,
  template,
}: {
  active: boolean;
  children: React.ReactNode;
  surface: PreviewSurface;
  template: InvitationTemplateKey;
}) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'bg-seraya-action-primary text-seraya-text-inverse inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold'
          : 'border-seraya-border-default bg-seraya-surface text-seraya-text-secondary hover:border-seraya-border-strong hover:text-seraya-text-primary inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors'
      }
      href={`/release-a-invitation-preview?template=${template}&surface=${surface}`}
    >
      {children}
    </Link>
  );
}

export default async function InvitationExperiencePreviewPage({
  searchParams,
}: InvitationPreviewPageProps) {
  if (process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  const params = searchParams ? await searchParams : undefined;
  const requestedTemplate = Array.isArray(params?.template) ? params.template[0] : params?.template;
  const requestedSurface = Array.isArray(params?.surface) ? params.surface[0] : params?.surface;
  const templateKey = isTemplateKey(requestedTemplate) ? requestedTemplate : 'roselle';
  const surface = isPreviewSurface(requestedSurface) ? requestedSurface : 'personal';

  return (
    <div className="bg-seraya-canvas min-h-screen">
      <header className="border-seraya-border-default bg-seraya-canvas/96 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto grid max-w-[94rem] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="seraya-eyebrow text-seraya-action-primary">Release A showroom</p>
            <h1 className="text-seraya-text-primary mt-1 font-serif text-2xl font-medium tracking-[-0.03em]">
              Invitation Experience Maturation
            </h1>
            <p className="text-seraya-text-muted mt-1 text-xs">
              Data fiktif · visual review only · tidak menyimpan respons
            </p>
          </div>
          <div className="grid gap-3">
            <nav aria-label="Pilih koleksi" className="flex flex-wrap gap-2">
              {templateKeys.map((key) => (
                <PreviewLink
                  active={templateKey === key}
                  key={key}
                  surface={surface}
                  template={key}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </PreviewLink>
              ))}
            </nav>
            <nav aria-label="Pilih surface" className="flex flex-wrap gap-2 lg:justify-end">
              {surfaces.map((item) => (
                <PreviewLink
                  active={surface === item}
                  key={item}
                  surface={item}
                  template={templateKey}
                >
                  {item === 'generic' ? 'Undangan publik' : 'Undangan personal'}
                </PreviewLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="min-h-screen px-0 py-0 sm:px-6 sm:py-8">
        <InvitationTemplateRenderer
          invitation={previewInvitation}
          personalSlots={
            surface === 'personal'
              ? {
                  greeting: <PreviewGreeting />,
                  guestbook: <PreviewGuestbook />,
                  rsvp: <PreviewRsvp />,
                }
              : undefined
          }
          surface={surface}
          templateKey={templateKey}
        />
      </main>
    </div>
  );
}
