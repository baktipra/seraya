import { DashboardPlaceholder } from '@/components/dashboard/dashboard-placeholder';

const featureNames = {
  billing: 'Tagihan',
  guests: 'Tamu',
  help: 'Bantuan',
  invitation: 'Undangan',
  settings: 'Pengaturan',
  share: 'Bagikan',
} as const;

type FeatureKey = keyof typeof featureNames;

type ComingSoonPageProps = {
  searchParams: Promise<{ feature?: string }>;
};

function resolveFeatureName(feature: string | undefined) {
  if (feature && feature in featureNames) {
    return featureNames[feature as FeatureKey];
  }

  return 'Fitur ini';
}

export default async function DashboardComingSoonPage({ searchParams }: ComingSoonPageProps) {
  const { feature } = await searchParams;

  return <DashboardPlaceholder featureName={resolveFeatureName(feature)} />;
}
