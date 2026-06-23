import type { Metadata } from 'next';

import { ToastProvider } from '@/design-system';
import { siteConfig } from '@/config/site';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Undangan Pernikahan yang Lebih Personal`,
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
