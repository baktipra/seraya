import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getInvitationWorkspaceEditorialSectionFromUrl,
  parseInvitationWorkspaceEditorialSection,
} from '@/components/projects/invitation-task-workspace.types';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('SERAYA Invitation Workspace Editorial Redesign V1', () => {
  it('defaults directly into Tema and preserves compatible legacy links', () => {
    expect(parseInvitationWorkspaceEditorialSection(undefined)).toBe('theme');
    expect(parseInvitationWorkspaceEditorialSection('closing')).toBe('closing');
    expect(parseInvitationWorkspaceEditorialSection(undefined, undefined, 'design')).toBe('theme');
    expect(parseInvitationWorkspaceEditorialSection(undefined, undefined, 'media')).toBe('gallery');
    expect(
      getInvitationWorkspaceEditorialSectionFromUrl(
        new URL('https://seraya.test/dashboard/project/invitation?section=music'),
      ),
    ).toBe('music');
  });

  it('uses the exact eleven-section editorial hierarchy without the old launcher', () => {
    const source = read('src/components/projects/invitation-task-workspace.tsx');
    const labels = [...source.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);

    expect(labels).toEqual([
      'Tema',
      'Pasangan',
      'Pembuka',
      'Acara',
      'Lokasi & Peta',
      'Cerita',
      'Galeri',
      'Musik',
      'Amplop Digital',
      'RSVP',
      'Penutup',
    ]);
    expect(source).toContain('data-invitation-workspace-editorial="v1"');
    expect(source).toContain('data-invitation-editorial-editor');
    expect(source).toContain('data-invitation-editorial-preview');
    expect(source).not.toContain('Lanjutkan di sini');
    expect(source).not.toContain('launcherHero');
    expect(source).not.toContain('data-workspace-task');
  });

  it('keeps one save authority and routes location through the existing schedule authority', () => {
    const source = read('src/components/projects/invitation-task-workspace.tsx');

    expect(source.match(/function SaveAuthority\(/g)).toHaveLength(1);
    expect(source.match(/data-invitation-task-save-action/g)).toHaveLength(1);
    expect(source).toContain('StudioSaveFormBridge');
    expect(source).toContain('activeSection="schedule"');
    expect(source).toContain('Lokasi mengikuti setiap acara.');
    expect(source).toContain('InvitationEditorActivePanel');
  });

  it('renders draft and guest version from separate real authorities', () => {
    const source = read('src/components/projects/invitation-studio-preview-rail.tsx');

    expect(source).toContain('InvitationTemplateRenderer');
    expect(source).toContain("version === 'published' && publishedSnapshot");
    expect(source).toContain('publishedSnapshot.snapshot.draft');
    expect(source).toContain('localContent');
    expect(source).toContain('Versi Tamu');
    expect(source).toContain('disabled={!hasPublishedVersion}');
    expect(source).not.toContain('Alia & Bagas');
    expect(source).not.toContain('Graha Kirana Ballroom');
  });

  it('keeps the private route on existing owner, draft, payment, readiness, and snapshot authorities', () => {
    const source = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');

    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getInvitationEditorForVerifiedProject');
    expect(source).toContain('getInvitationReadinessForVerifiedProject');
    expect(source).toContain('getPaymentOverviewForVerifiedProject');
    expect(source).toContain('getCurrentPublishedInvitationForVerifiedProject');
    expect(source).toContain('InvitationStudioProvider');
    expect(source).toContain('InvitationStudioPublishMode');
    expect(source).toContain('InvitationStudioMediaMode');
    expect(source).toContain('InvitationStudioDesignMode');
  });

  it('contains responsive geometry for desktop, tablet, and mobile without document overflow intent', () => {
    const styles = read('src/components/projects/invitation-task-workspace.module.css');

    expect(styles).toContain(
      'grid-template-columns: minmax(10.75rem, 12.25rem) minmax(0, 1fr) minmax(17.5rem, 20rem);',
    );
    expect(styles).toContain('@container (max-width: 72rem)');
    expect(styles).toContain('@container (max-width: 52rem)');
    expect(styles).toContain('@container (max-width: 38rem)');
    expect(styles).toContain('overflow-x: clip;');
  });
});
