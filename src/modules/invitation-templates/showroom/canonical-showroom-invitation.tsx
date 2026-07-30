import type { InvitationTemplateKey } from '../invitation-template.keys';
import type { PersonalInvitationPresentationSlotsV1 } from '../invitation-template.types';
import { createInvitationViewModel } from '../invitation-view-model';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

export const CANONICAL_SHOWROOM_COUPLE = {
  displayName: 'Kirana & Arga',
  personOne: {
    displayName: 'Kirana',
    fullName: 'Kirana Ayu Prameswari',
    parentLine: 'Putri pertama dari Bapak Mahendra Prasetya dan Ibu Ratih Kusumaningrum',
  },
  personTwo: {
    displayName: 'Arga',
    fullName: 'Arga Dananjaya Wicaksana',
    parentLine: 'Putra kedua dari Bapak Baskara Wicaksana dan Ibu Larasati Purnamadewi',
  },
} as const;

export const CANONICAL_SHOWROOM_ASSET_SLOTS = [
  {
    id: 'showroom-opening-portrait',
    label: 'Potret pembuka',
    role: 'opening-portrait',
    crop: '4:5',
  },
  {
    id: 'showroom-environmental-wide',
    label: 'Potret lingkungan',
    role: 'environmental-wide',
    crop: '3:2',
  },
  {
    id: 'showroom-gallery-lead',
    label: 'Galeri utama',
    role: 'gallery-lead',
    crop: '4:5',
  },
  {
    id: 'showroom-detail-one',
    label: 'Detail persiapan',
    role: 'detail-square',
    crop: '1:1',
  },
  {
    id: 'showroom-detail-two',
    label: 'Detail kebersamaan',
    role: 'supporting-detail',
    crop: '4:3',
  },
  {
    id: 'showroom-venue',
    label: 'Lokasi perayaan',
    role: 'venue-wide',
    crop: '3:2',
  },
] as const;

export type CanonicalShowroomAssetSlot = (typeof CANONICAL_SHOWROOM_ASSET_SLOTS)[number];

const showroomProject = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: CANONICAL_SHOWROOM_COUPLE.personOne.displayName,
  person_two_name: CANONICAL_SHOWROOM_COUPLE.personTwo.displayName,
};

const showroomPalettes = [
  ['#6f4652', '#d7a99f', '#f4e4dd'],
  ['#866353', '#d5a16f', '#efe1ca'],
  ['#5f655d', '#a8af9e', '#e3e5dc'],
  ['#4d3b4c', '#9d7b92', '#ded1db'],
  ['#7b6256', '#b9997e', '#eaded0'],
  ['#443d45', '#8a765c', '#d7c7aa'],
] as const;

function createCanonicalAssetSvg(
  slot: CanonicalShowroomAssetSlot,
  palette: (typeof showroomPalettes)[number],
) {
  const [deep, accent, light] = palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125" viewBox="0 0 900 1125" role="img" aria-label="${slot.label}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${light}"/>
        <stop offset="0.58" stop-color="${accent}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.28" cy="0.18" r="0.74">
        <stop offset="0" stop-color="#fff" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <rect width="900" height="1125" fill="url(#sky)"/>
    <rect width="900" height="1125" fill="url(#glow)"/>
    <circle cx="690" cy="205" r="205" fill="#fff" opacity="0.12"/>
    <path d="M0 790 C190 680 300 770 438 728 C604 678 692 514 900 540 V1125 H0Z" fill="${deep}" opacity="0.28"/>
    <path d="M0 914 C210 792 366 934 542 846 C670 782 755 724 900 750 V1125 H0Z" fill="#fff" opacity="0.16"/>
    <g transform="translate(292 308)">
      <ellipse cx="112" cy="116" rx="72" ry="84" fill="#ead6ca" opacity="0.95"/>
      <path d="M40 218 C54 150 174 146 194 222 L214 524 H10Z" fill="#f6efe8" opacity="0.94"/>
      <ellipse cx="280" cy="118" rx="74" ry="86" fill="#d9b8a7" opacity="0.95"/>
      <path d="M208 220 C226 148 344 150 364 224 L392 524 H182Z" fill="${deep}" opacity="0.9"/>
      <path d="M162 304 C204 286 230 286 270 306" fill="none" stroke="#f4e5dc" stroke-width="18" stroke-linecap="round" opacity="0.78"/>
    </g>
    <g opacity="0.22" filter="url(#soft)">
      <circle cx="106" cy="270" r="78" fill="#fff"/>
      <circle cx="798" cy="862" r="104" fill="#fff"/>
    </g>
    <path d="M74 1040 H826" stroke="#fff" stroke-opacity="0.32" stroke-width="2"/>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const CANONICAL_SHOWROOM_GALLERY_IMAGES: InvitationGalleryImage[] =
  CANONICAL_SHOWROOM_ASSET_SLOTS.map((slot, index) => ({
    alt: `${slot.label} fiktif Kirana dan Arga untuk showroom Seraya`,
    id: `00000000-0000-4000-8000-${String(index + 401).padStart(12, '0')}`,
    src: createCanonicalAssetSvg(slot, showroomPalettes[index] ?? showroomPalettes[0]),
  }));

export function createCanonicalShowroomInvitation(templateKey: InvitationTemplateKey) {
  const content = createDefaultInvitationDraftContent(showroomProject);

  content.templateKey = templateKey;
  content.hero.eyebrow = 'The wedding of';
  content.hero.title = CANONICAL_SHOWROOM_COUPLE.displayName;
  content.hero.subtitle =
    'Dengan penuh syukur, kami mengundang Anda untuk hadir dalam perayaan keluarga dan awal perjalanan baru kami.';
  content.couple.personOne = { ...CANONICAL_SHOWROOM_COUPLE.personOne };
  content.couple.personTwo = { ...CANONICAL_SHOWROOM_COUPLE.personTwo };
  content.story = {
    body: 'Kami berkenalan melalui lingkar pertemanan yang sederhana, lalu menemukan banyak alasan untuk terus berbagi cerita. Dari perjalanan singkat, percakapan bersama keluarga, sampai keputusan-keputusan kecil yang kami jalani berdampingan, kami belajar bahwa rumah adalah rasa tenang ketika dua orang terus memilih satu sama lain.',
    enabled: true,
    heading: 'Perjalanan yang membawa kami pulang',
  };
  content.eventSchedule = {
    events: [
      {
        date: '2027-08-17',
        endTime: '10:30',
        id: '00000000-0000-4000-8000-000000000501',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Istiqlal+Jakarta',
        startTime: '08:30',
        title: 'Akad Nikah dan Doa Keluarga',
        venueAddress:
          'Ruang Utama Masjid Istiqlal\nJl. Taman Wijaya Kusuma, Pasar Baru, Sawah Besar, Jakarta Pusat 10710',
        venueName: 'Masjid Istiqlal Jakarta',
      },
      {
        date: '2027-08-17',
        endTime: '21:00',
        id: '00000000-0000-4000-8000-000000000502',
        mapsUrl: 'https://maps.google.com/?q=Jakarta+Convention+Center',
        startTime: '18:30',
        title: 'Resepsi dan Jamuan Malam',
        venueAddress:
          'Assembly Hall, Jakarta Convention Center\nJl. Jenderal Gatot Subroto, Gelora, Tanah Abang, Jakarta Pusat 10270',
        venueName: 'Jakarta Convention Center — Assembly Hall',
      },
    ],
  };
  content.gallery = {
    enabled: true,
    imageIds: CANONICAL_SHOWROOM_GALLERY_IMAGES.map((image) => image.id),
  };
  content.digitalGift = {
    accounts: [
      {
        accountHolder: CANONICAL_SHOWROOM_COUPLE.personOne.fullName,
        accountNumber: '1234567890',
        id: '00000000-0000-4000-8000-000000000601',
        providerName: 'Bank Central Asia',
      },
      {
        accountHolder: CANONICAL_SHOWROOM_COUPLE.personTwo.fullName,
        accountNumber: '9876543210',
        id: '00000000-0000-4000-8000-000000000602',
        providerName: 'Bank Mandiri',
      },
    ],
    enabled: true,
    heading: 'Tanda kasih untuk perjalanan baru',
    lead: 'Kehadiran dan doa Anda merupakan hadiah terindah. Bila berkenan, tanda kasih dapat disampaikan melalui salah satu rekening keluarga berikut.',
  };
  content.closing = {
    enabled: true,
    message:
      'Terima kasih telah menyertai kabar bahagia kami. Kehadiran, doa, dan perhatian Anda akan selalu menjadi bagian hangat dari awal perjalanan keluarga kami.',
    signature: CANONICAL_SHOWROOM_COUPLE.displayName,
  };
  content.rsvp = {
    enabled: true,
    heading: 'Konfirmasi Kehadiran',
    lead: 'Kami menantikan kabar Anda dan keluarga.',
  };

  return createInvitationViewModel({
    draft: { content },
    galleryImages: CANONICAL_SHOWROOM_GALLERY_IMAGES,
    project: { event_date_primary: showroomProject.event_date_primary },
  });
}

const demoPanelStyle = {
  border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
  borderRadius: '1.25rem',
  padding: '1.25rem',
} as const;

export function createCanonicalShowroomPersonalSlots(): PersonalInvitationPresentationSlotsV1 {
  return {
    greeting: (
      <div data-showroom-demo-slot="greeting">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-65">Kepada Yth.</p>
        <p className="mt-3 font-serif text-3xl leading-tight">Bapak Andi Pratama &amp; Keluarga</p>
        <p className="mt-4 text-sm leading-7 opacity-75">
          Dengan penuh rasa bahagia, kami mengundang Anda dan keluarga untuk hadir serta
          menyertai hari pernikahan kami.
        </p>
      </div>
    ),
    rsvp: (
      <section data-showroom-demo-slot="rsvp" style={demoPanelStyle}>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-65">
          Simulasi personal
        </p>
        <h3 className="mt-3 font-serif text-3xl leading-tight">Konfirmasi Kehadiran</h3>
        <p className="mt-3 text-sm leading-6 opacity-75">
          Form ini hanya contoh tampilan dan tidak menyimpan respons.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button className="min-h-12 rounded-full border border-current px-5" disabled type="button">
            Hadir
          </button>
          <button className="min-h-12 rounded-full border border-current px-5" disabled type="button">
            Tidak hadir
          </button>
        </div>
      </section>
    ),
    guestbook: (
      <section data-showroom-demo-slot="guestbook" style={demoPanelStyle}>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-65">
          Simulasi personal
        </p>
        <h3 className="mt-3 font-serif text-3xl leading-tight">Titipkan Ucapan</h3>
        <textarea
          aria-label="Contoh kolom ucapan yang tidak aktif"
          className="mt-5 min-h-28 w-full resize-none rounded-2xl border border-current bg-transparent p-4 opacity-65"
          disabled
          placeholder="Doa dan ucapan untuk Kirana & Arga"
        />
        <button className="mt-3 min-h-12 rounded-full border border-current px-5" disabled type="button">
          Kirim ucapan
        </button>
      </section>
    ),
  };
}
