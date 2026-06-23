import Link from 'next/link';

import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="bg-seraya-canvas flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <Link
          className="text-seraya-text-primary mb-8 inline-flex font-serif text-3xl tracking-[-0.04em] focus-visible:rounded-sm"
          href="/"
        >
          {siteConfig.name}
        </Link>
        {children}
      </div>
    </main>
  );
}
