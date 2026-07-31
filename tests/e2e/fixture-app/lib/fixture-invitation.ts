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
  createFixtureImage('00000000-0000-4000-8000-000000000105', 'Keluarga', '#76665c'),
  createFixtureImage('00000000-0000-4000-8000-000000000106', 'Perayaan', '#7f5966'),
];

export function createFixtureInvitation(templateKey: InvitationTemplateKey) {
  const content = createDefaultInvitationDraftContent(project);
  content.templateKey = templateKey;
  content.hero.subtitle =
    'Dengan penuh syukur, kami mengundang Anda untuk menjadi bagian dari perjalanan baru kami bersama keluarga dan orang-orang terkasih.';
  content.couple.personOne.fullName = 'Raka Adiprana Wiratama';
  content.couple.personOne.parentLine =
    'Putra pertama dari Bapak Hendra Wiratama dan Ibu Ratna Kusumawardani';
  content.couple.personTwo.fullName = 'Nadia Kirana Maharani';
  content.couple.personTwo.parentLine =
    'Putri kedua dari Bapak Surya Mahardika dan Ibu Lestari Puspitaningrum';
  content.story = {
    body: 'Berawal dari pertemuan sederhana di tengah kesibukan Jakarta, kami tumbuh bersama melalui percakapan panjang, perjalanan keluarga, dan banyak keputusan kecil. Kami belajar bahwa rumah bukan hanya sebuah tempat, tetapi rasa tenang ketika dapat berjalan berdampingan dan saling memilih setiap hari.',
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
        title: 'Akad Nikah dan Doa Keluarga',
        venueAddress:
          'Jl. Taman Wijaya Kusuma, Pasar Baru, Kecamatan Sawah Besar\nJakarta Pusat, Daerah Khusus Ibukota Jakarta 10710',
        venueName: 'Ruang Utama Masjid Istiqlal Jakarta',
      },
      {
        date: '2027-08-17',
        endTime: '20:00',
        id: '00000000-0000-4000-8000-000000000202',
        mapsUrl: 'https://maps.google.com/?q=Jakarta+Convention+Center',
        startTime: '18:00',
        title: 'Resepsi dan Jamuan Malam',
        venueAddress:
          'Assembly Hall, Jakarta Convention Center\nJl. Jenderal Gatot Subroto, Gelora, Tanah Abang, Jakarta Pusat 10270',
        venueName: 'Jakarta Convention Center — Assembly Hall',
      },
    ],
  };
  content.location = {
    address:
      'Assembly Hall, Jakarta Convention Center\nJl. Jenderal Gatot Subroto, Gelora, Tanah Abang, Jakarta Pusat 10270',
    enabled: true,
    mapsUrl: 'https://maps.google.com/?q=Jakarta+Convention+Center',
    venueName: 'Jakarta Convention Center — Assembly Hall',
  };
  content.gallery = {
    enabled: true,
    imageIds: galleryImages.map((image) => image.id),
  };
  content.digitalGift = {
    accounts: [
      {
        accountHolder: 'Raka Adiprana Wiratama',
        accountNumber: '1234567890',
        id: '00000000-0000-4000-8000-000000000301',
        providerName: 'Bank Central Asia',
      },
      {
        accountHolder: 'Nadia Kirana Maharani',
        accountNumber: '9876543210123456',
        id: '00000000-0000-4000-8000-000000000302',
        providerName: 'Bank Mandiri',
      },
    ],
    enabled: true,
    heading: 'Tanda kasih untuk perjalanan baru',
    lead: 'Kehadiran dan doa Anda adalah hadiah terindah. Bila berkenan, tanda kasih dapat disampaikan melalui salah satu rekening keluarga berikut.',
  };
  content.closing = {
    enabled: true,
    message:
      'Terima kasih telah menyertai kabar bahagia kami. Kehadiran, doa, dan perhatian Anda akan selalu menjadi bagian hangat dari awal perjalanan keluarga kami.',
    signature: 'Raka & Nadia',
  };
  content.rsvp = {
    enabled: true,
    heading: 'Konfirmasi Kehadiran',
    lead: 'Kami menantikan kabar Anda dan keluarga.',
  };

  return createInvitationViewModel({
    draft: { content },
    galleryImages,
    project: { event_date_primary: project.event_date_primary },
  });
}
