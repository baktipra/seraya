import '../../../../src/app/globals.css';
import '../../../../src/app/accessibility-release.css';
import '../../../../src/app/personal-response-release.css';
import '../../../../src/app/invitation-maturation-release.css';
import '../../../../src/app/invitation-opening-maturation-release.css';
import '../../../../src/app/invitation-media-release.css';
import '../../../../src/app/invitation-layout-recovery.css';
import '../../../../src/app/invitation-template-quality-bar.css';

export default function FixtureRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="bg-seraya-ivory h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
