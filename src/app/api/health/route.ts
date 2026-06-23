import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    service: siteConfig.name,
    timestamp: new Date().toISOString(),
  });
}
