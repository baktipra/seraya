import { Card, CardContent } from '@/design-system';

export function ProfileRecoveryNotice() {
  return (
    <Card aria-live="polite" tone="soft">
      <CardContent>
        <p className="text-seraya-text-primary text-sm font-semibold">
          Profil akun sedang disiapkan
        </p>
        <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
          Kamu sudah masuk ke Seraya, tetapi profil belum bisa dibaca dengan aman. Segarkan halaman
          beberapa saat lagi.
        </p>
      </CardContent>
    </Card>
  );
}
