import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('SERAYA Owner Workspace Editorial Dashboard V3', () => {
  it('uses the supplied five-area project information architecture', () => {
    const source = read('src/components/dashboard/project-navigation.tsx');
    const labels = [...source.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);

    expect(labels).toEqual(['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']);
    expect(source).toContain("href: `${base}/delivery` as Route");
    expect(source).toContain("aliases: [`${base}/guestbook`, `${base}/follow-up`]");
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

  it('turns Ringkasan into a readiness-backed project status dashboard', () => {
    const source = read('src/components/projects/project-overview-bootstrap.tsx');

    expect(source).toContain('Selamat datang kembali');
    expect(source).toContain('Status undangan');
    expect(source).toContain('Tamu aktif');
    expect(source).toContain('Respons masuk');
    expect(source).toContain('Siap dibagikan');
    expect(source).toContain('Perjalanan proyek');
    expect(source).toContain('Langkah berikutnya');
    expect(source).toContain('Buat proyek');
    expect(source).toContain('Pilih tema');
    expect(source).toContain('Lengkapi konten');
    expect(source).toContain('Bagikan & pantau');
    expect(source).not.toContain('CanonicalInvitationThumbnail');
    expect(source).not.toContain('GuestRosterVisual');
    expect(source).not.toContain('ResponseFlowVisual');
  });

  it('preserves one shared draft and one invitation save authority', () => {
    const source = read('src/components/projects/invitation-task-workspace.tsx');

    expect(source.match(/function SaveAuthority\(/g)).toHaveLength(1);
    expect(source.match(/data-invitation-task-save-action/g)).toHaveLength(1);
    expect(source).toContain('useInvitationStudioState');
    expect(source).toContain('form={studioState.formId}');
    expect(source).toContain('InvitationEditorActivePanel');
    expect(source.match(/number: '\d{2}'/g)).toHaveLength(11);
  });

  it('preserves distinct visual glyphs for every invitation task', () => {
    const source = read('src/components/projects/owner-workspace-visuals.tsx');
    const tasks = [
      'couple',
      'opening',
      'schedule',
      'story',
      'media',
      'gift',
      'rsvp',
      'closing',
      'design',
      'preview',
      'publish',
    ];

    for (const task of tasks) {
      expect(source).toContain(`case '${task}':`);
    }
  });

  it('keeps project geometry flush, responsive, and isolated from production deployment', () => {
    const anatomy = read('src/app/workspace-anatomy.css');
    const navigationStyles = read('src/components/dashboard/project-navigation.module.css');
    const overviewStyles = read('src/components/projects/project-overview-bootstrap.module.css');
    const vercel = read('vercel.json');

    expect(anatomy).toContain('grid-template-columns: var(--seraya-project-rail-width) minmax(0, 1fr);');
    expect(anatomy).toContain('gap: 0;');
    expect(navigationStyles).toContain('@media (max-width: 1023px)');
    expect(navigationStyles).toContain('.mobileDrawer');
    expect(overviewStyles).toContain('@media (max-width: 900px)');
    expect(overviewStyles).toContain('@media (max-width: 560px)');
    expect(vercel).toContain('"feature/owner-workspace-editorial-dashboard-v3": false');
  });
});
