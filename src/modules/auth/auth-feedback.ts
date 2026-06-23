export type LoginNoticeCode = 'auth_failed' | 'profile_unavailable' | 'signed_out';

const noticeMessages: Record<LoginNoticeCode, string> = {
  auth_failed: 'Kami belum bisa menyelesaikan proses masuk. Silakan kirim link masuk baru.',
  profile_unavailable:
    'Akun kamu sudah masuk, tetapi profil belum siap dibuka. Segarkan halaman beberapa saat lagi.',
  signed_out: 'Kamu sudah keluar dari Seraya.',
};

export function getLoginNotice(value: string | null | undefined): string | null {
  if (!value || !(value in noticeMessages)) {
    return null;
  }

  return noticeMessages[value as LoginNoticeCode];
}
