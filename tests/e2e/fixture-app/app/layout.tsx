import '../../../../src/app/globals.css';
import '../../../../src/app/accessibility-release.css';
import '../../../../src/app/personal-response-release.css';

export default function FixtureRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="bg-seraya-ivory h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
