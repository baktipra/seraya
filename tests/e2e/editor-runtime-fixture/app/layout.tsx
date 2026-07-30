import { ToastProvider } from '@/design-system';

import '../../../../src/app/globals.css';
import '../../../../src/app/flagship-release-a.css';
import '../../../../src/app/workspace-anatomy.css';
import '../../../../src/app/workspace-responsive.css';
import '../../../../src/app/accessibility-release.css';
import '../../../../src/app/personal-response-release.css';
import '../../../../src/app/invitation-maturation-release.css';
import '../../../../src/app/invitation-opening-maturation-release.css';
import '../../../../src/app/invitation-media-release.css';
import '../../../../src/app/roselle-flagship-maturation-release.css';

export default function EditorRuntimeFixtureLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="bg-seraya-ivory h-full">
      <body className="min-h-full antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
