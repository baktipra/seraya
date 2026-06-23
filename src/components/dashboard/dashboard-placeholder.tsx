import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';

export interface DashboardPlaceholderProps {
  featureName: string;
}

export function DashboardPlaceholder({ featureName }: DashboardPlaceholderProps) {
  return (
    <Card className="max-w-2xl" aria-labelledby="dashboard-placeholder-title">
      <CardHeader>
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Dashboard Seraya
        </p>
        <CardTitle id="dashboard-placeholder-title" className="mt-2 text-3xl sm:text-[2rem]">
          {featureName} sedang disiapkan
        </CardTitle>
        <CardDescription className="text-base">
          Area ini akan tersedia setelah fondasi undangan Seraya siap.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form action="/dashboard" method="get">
          <Button type="submit" variant="secondary">
            Kembali ke Overview
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
