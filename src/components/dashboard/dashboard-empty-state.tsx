import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';

export function DashboardEmptyState() {
  return (
    <Card className="overflow-hidden" aria-labelledby="empty-dashboard-title">
      <div className="bg-seraya-brand-soft px-6 py-8 sm:px-8 sm:py-10">
        <Badge variant="brand">Ruang baru</Badge>
        <h1
          id="empty-dashboard-title"
          className="seraya-display-md mt-5 max-w-xl text-[clamp(2rem,4vw,3.25rem)]"
        >
          Belum ada undangan
        </h1>
        <p className="text-seraya-text-secondary mt-4 max-w-xl text-base leading-7">
          Saat kamu siap, mulai buat undangan pernikahan pertama kamu di Seraya.
        </p>
      </div>
      <CardHeader>
        <CardTitle className="font-sans text-lg font-semibold tracking-[-0.02em]">
          Mulai dari kabar bahagia kalian
        </CardTitle>
        <CardDescription>
          Cukup siapkan nama panggilan, tanggal acara utama, kota, dan link undangan yang kamu
          inginkan.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form action="/dashboard/new" method="get">
          <Button type="submit">Buat undangan baru</Button>
        </form>
      </CardContent>
    </Card>
  );
}
