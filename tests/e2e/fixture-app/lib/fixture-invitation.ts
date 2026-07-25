import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import { createInvitationViewModel } from '@/modules/invitation-templates/invitation-view-model';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function createFixtureImage(id: string, label: string, background: string): InvitationGalleryImage {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125" viewBox="0 0 900 1125"><rect width="900" height="1125" fill="${background}"/><circle cx="720" cy="210" r="180" fill="rgba(255,255,255,.22)"/><path d="M0 860 C260 690 420 990 900 720 V1125 H0Z" fill="rgba(255,255,255,.18)"/><text x="70" y="1010" fill="white" font-family="Georgia, serif" font-size="58">${label}</text></svg>`;

  return {
    alt: `Foto fiktif ${label} untuk regression Seraya`,
    id,
    src: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
}

const galleryImages = [
  createFixtureImage('00000000-0000-4000-8000-000000000101', 'Persiapan', '#9a626c'),
  createFixtureImage('00000000-0000-4000-8000-000000000102', 'Pertemuan', '#67746c'),
  createFixtureImage('00000000-0000-4000-8000-000000000103', 'Perjalanan', '#a66e55'),
  createFixtureImage('00000000-0000-4000-8000-000000000104', 'Hari Bahagia', '#59475f'),
];

export function createFixtureInvitation(templateKey: InvitationTemplateKey) {
  const content = createDefaultInvitationDraftContent(project);
  content.templateKey = templateKey;
  content.hero.subtitle =
    'Dengan penuh syukur, kami mengundang Anda untuk menjadi bagian dari perjalanan baru kami.';
  content.couple.personOne.fullName = 'Raka Pradana';
  content.couple.personOne.parentLine = 'Putra dari Bapak Hendra & Ibu Ratna';
  content.couple.personTwo.fullName = 'Nadia Kirana';
  content.couple.personTwo.parentLine = 'Putri dari Bapak Surya & Ibu Lestari';
  content.story = {
    body: 'Berawal dari pertemuan sederhana, kami tumbuh bersama dan belajar bahwa rumah dapat ditemukan dalam satu sama lain.',
    enabled: true,
    heading: 'Cerita yang membawa kami ke sini',
  };
  content.eventSchedule = {
    events: [
      {
        date: '2027-08-17',
        endTime: '10:00',
        id: '00000000-0000-4000-8000-000000000201',
        mapsUrl: 'https://maps.google.com/?q=Masjid+Istiqlal+Jakarta',
        startTime: '08:00',
        title: 'Akad Nikah',
        venueAddress: 'Jl. Taman Wijaya Kusuma, Jakarta Pusat',
        venueName: 'Masjid Istiqlal',
      },
      {
        date: '2027-08-17',
        endTime: '20:00',
        id: '00000000-0000-4000-8000-000000000202',
        mapsUrl: 'https://maps.google.com/?q=Jakarta+Convention+Center',
        startTime: '18:00',
        title: 'Resepsi',
        venueAddress: 'Jl. Gatot Subroto, Jakarta Pusat',
        venueName: 'Jakarta Convention Center',
      },
    ],
  };
  content.gallery = {
    enabled: true,
    imageIds: galleryImages.map((image) => image.id),
  };
  content.digitalGift = {
    accounts: [
      {
        accountHolder: 'Raka Pradana',
        accountNumber: '1234567890',
        id: '00000000-0000-4000-8000-000000000301',
        providerName: 'Bank Central Asia',
      },
    ],
    enabled: true,
    heading: 'Tanda kasih untuk perjalanan baru',
    lead: 'Kehadiran dan doa Anda adalah hadiah terindah. Bila berkenan, tanda kasih dapat disampaikan melalui rekening berikut.',
  };
  content.closing = {
    enabled: true,
    message: 'Terima kasih telah menyertai kabar bahagia kami. Sampai berjumpa di hari pernikahan.',
    signature: 'Raka & Nadia',
  };
  content.rsvp = {
    enabled: true,
    heading: 'Konfirmasi Kehadiran',
    lead: 'Kami menantikan kabar Anda.',
  };

  return createInvitationViewModel({
    draft: { content },
    galleryImages,
    project: { event_date_primary: project.event_date_primary },
  });
}
