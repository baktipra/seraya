import type { PropsWithChildren } from 'react';

export function MarketingPageShell({ children }: PropsWithChildren) {
  return (
    <div
      className="bg-seraya-canvas mx-auto min-h-screen w-full max-w-[75rem] overflow-x-hidden"
      data-marketing-page-shell
    >
      {children}
    </div>
  );
}
