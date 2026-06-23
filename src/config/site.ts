export const siteConfig = {
  name: 'Seraya',
  description:
    'Platform undangan pernikahan Indonesia yang membantu pasangan membuat undangan personal dan mengelola tamu dengan lebih tenang.',
  locale: 'id-ID',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
