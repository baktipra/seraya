import type { Metadata } from 'next';

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
    <html lang="id" className="bg-seraya-ivory h-full">
      <body className="min-h-full antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
