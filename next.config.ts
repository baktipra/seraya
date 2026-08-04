import type { NextConfig } from 'next';

const personalGuestResponseHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [
      {
        headers: personalGuestResponseHeaders,
        source: '/:slug/g/:guestToken',
      },
      {
        headers: personalGuestResponseHeaders,
        source: '/:slug/g/:guestToken/rsvp',
      },
    ];
  },
};

export default nextConfig;
