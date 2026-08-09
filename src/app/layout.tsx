import type { Metadata } from 'next';
import { Fraunces, Geist } from 'next/font/google';

import { siteConfig } from '@/config/site';
import { ToastProvider } from '@/design-system';

import './globals.css';
import './flagship-release-a.css';
import './workspace-anatomy.css';
import './workspace-responsive.css';
import './accessibility-release.css';
import './personal-response-release.css';
import './invitation-maturation-release.css';
import './invitation-opening-maturation-release.css';
import './invitation-media-release.css';
import './roselle-flagship-maturation-release.css';
import './invitation-layout-recovery.css';
import './invitation-template-quality-bar.css';
import './aruna-flagship-maturation-release.css';

const geist = Geist({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-geist',
});

const fraunces = Fraunces({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Pengalaman Tamu Pernikahan yang Personal`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geist.variable} ${fraunces.variable} bg-seraya-ivory h-full`}>
      <body className="min-h-full antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
