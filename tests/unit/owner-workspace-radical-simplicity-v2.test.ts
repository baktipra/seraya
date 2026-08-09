import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('SERAYA Owner Dashboard Cognitive Compression V1', () => {
  it('preserves the canonical five-area project information architecture', () => {
    const source = read('src/components/dashboard/project-navigation.tsx');
    const labels = [...source.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);

    expect(labels).toEqual(['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']);
    expect(source).toContain('href: `${base}/delivery` as Route');
    expect(source).toContain('aliases: [`${base}/guestbook`, `${base}/follow-up`]');
    expect(source).toContain('data-project-sidebar');
    expect(source).toContain('Buka navigasi proyek');
  });

  it('keeps the collection shell simple and gives project routes the editorial shell', () => {
    const shell = read('src/components/dashboard/dashboard-shell.tsx');
    const shellStyles = read('src/components/dashboard/dashboard-shell.module.css');
    const rootLayout = read('src/app/layout.tsx');

    expect(shell).toContain('data-owner-workspace-navigation="editorial-five-area"');
    expect(shell).toContain('data-owner-workspace-typography="editorial-operations"');
    expect(shell).toContain('data-project-workspace-route');
    expect(shell).toContain('DashboardDesktopNavigation');
    expect(shellStyles).toContain('background: #1f3d2b;');
    expect(shellStyles).toContain('--seraya-bg-canvas: #faf6ee;');
    expect(shellStyles).toContain('--seraya-action-secondary: #b8935f;');
    expect(rootLayout).toContain("import { Fraunces, Geist } from 'next/font/google';");
    expect(rootLayout).toContain("variable: '--font-fraunces'");
  });

  it('compresses Ringkasan to exactly one priority-derived action plus a compact pulse', () => {
    const source = read('src/components/projects/project-overview-bootstrap.tsx');

    expect(source).toContain('data-owner-dashboard-cognitive-compression="v1"');
    expect(source).toContain('Prioritas sekarang');
    expect(source.match(/data-owner-priority-action/g)).toHaveLength(1);
    expect(source).toContain('Status undangan');
    expect(source).toContain('Tamu aktif');
    expect(source).toContain('Respons masuk');
    expect(source).toContain('Siap dibagikan');
    expect(source).not.toContain('project-journey-title');
    expect(source).not.toContain('next-steps-title');
    expect(source).not.toContain('Buat proyek');
    expect(source).not.toContain('Pilih tema');
    expect(source).not.toContain('Bagikan & pantau');
  });

  it('keeps Bagikan as one canonical destination with personal delivery as the default view', () => {
    const source = read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx');

    expect(source).toContain("type DeliveryView = 'personal' | 'public';");
    expect(source).toContain("return resolved === 'public' ? 'public' : 'personal';");
    expect(source).toContain('data-delivery-view-navigation');
    expect(source).toContain('Undangan Pribadi');
    expect(source).toContain('Story & QR Publik');
    expect(source).toContain("view === 'public'");
    expect(source).toContain('<PublicSocialShareKit');
    expect(source).toContain('<NativeGuestDeliveryCenter');
  });

  it('preserves one shared invitation draft and one save authority', () => {
    const source = read('src/components/projects/invitation-task-workspace.tsx');

    expect(source.match(/function SaveAuthority\(/g)).toHaveLength(1);
    expect(source.match(/data-invitation-task-save-action/g)).toHaveLength(1);
    expect(source).toContain('useInvitationStudioState');
    expect(source).toContain('form={studioState.formId}');
    expect(source).toContain('InvitationEditorActivePanel');
    expect(source).toContain('data-invitation-editor-dashboard="v1"');
    expect(source).toContain("title: 'Tema'");
    expect(source).toContain("title: 'Galeri & musik'");
  });

  it('uses shared focus management and a grid-safe live region for project navigation', () => {
    const navigation = read('src/components/dashboard/project-navigation.tsx');
    const navigationStyles = read('src/components/dashboard/project-navigation.module.css');

    expect(navigation).toContain("from '@/lib/focus-management'");
    expect(navigation).toContain('focusFirstDescendant(drawer, drawer)');
    expect(navigation).toContain('trapFocusWithin(event, drawer)');
    expect(navigation).toContain('aria-modal="true"');
    expect(navigation).toContain('role="dialog"');
    expect(navigation).toContain('aria-controls="project-mobile-navigation"');
    expect(navigation).toContain('className={styles.routeAnnouncement}');
    expect(navigationStyles).toContain('.routeAnnouncement');
    expect(navigationStyles).toContain('position: absolute;');
    expect(navigationStyles).toContain('width: 2.75rem;');
    expect(navigationStyles).toContain('height: 2.75rem;');
    expect(navigationStyles).toContain('env(safe-area-inset-bottom)');
  });

  it('pins desktop workspace geometry and blocks preview deployment for this feature branch', () => {
    const anatomy = read('src/app/workspace-anatomy.css');
    const overviewStyles = read('src/components/projects/project-overview-bootstrap.module.css');
    const vercel = read('vercel.json');

    expect(anatomy).toContain(
      'grid-template-columns: var(--seraya-project-rail-width) minmax(0, 1fr);',
    );
    expect(anatomy).toContain('[data-project-sidebar] {');
    expect(anatomy).toContain('grid-column: 1;');
    expect(anatomy).toContain('[data-project-workspace-main] {');
    expect(anatomy).toContain('grid-column: 2;');
    expect(overviewStyles).toContain('@media (max-width: 900px)');
    expect(overviewStyles).toContain('@media (max-width: 560px)');
    expect(vercel).toContain('"feature/owner-dashboard-cognitive-compression-v1": false');
  });
});
