import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  getInvitationWorkspaceTaskFromUrl,
  parseInvitationWorkspaceTask,
} from '@/components/projects/invitation-task-workspace.types';

describe('Seraya Owner Workspace Usability Reset V1', () => {
  it('uses task-first canonical routing while retaining legacy mode compatibility', () => {
    expect(parseInvitationWorkspaceTask('couple')).toBe('couple');
    expect(parseInvitationWorkspaceTask('publish')).toBe('publish');
    expect(parseInvitationWorkspaceTask(undefined, 'design')).toBe('design');
    expect(parseInvitationWorkspaceTask(undefined, 'media')).toBe('media');
    expect(parseInvitationWorkspaceTask(undefined, 'preview')).toBe('preview');
    expect(parseInvitationWorkspaceTask(undefined, 'publish')).toBe('publish');
    expect(parseInvitationWorkspaceTask(undefined, 'content')).toBeNull();
  });

  it('recovers legacy content, style, and gallery chapter links', () => {
    expect(
      getInvitationWorkspaceTaskFromUrl(
        new URL('https://seraya.test/dashboard/project/invitation?mode=content#bagian-couple'),
      ),
    ).toBe('couple');
    expect(
      getInvitationWorkspaceTaskFromUrl(
        new URL('https://seraya.test/dashboard/project/invitation?mode=content#bagian-style'),
      ),
    ).toBe('design');
    expect(
      getInvitationWorkspaceTaskFromUrl(
        new URL('https://seraya.test/dashboard/project/invitation?mode=content#bagian-gallery'),
      ),
    ).toBe('media');
    expect(
      getInvitationWorkspaceTaskFromUrl(
        new URL('https://seraya.test/dashboard/project/invitation?task=schedule'),
      ),
    ).toBe('schedule');
  });

  it('keeps one save authority while yielding the old launcher to the editorial workspace', () => {
    const source = readFileSync(
      'src/components/projects/invitation-task-workspace.tsx',
      'utf8',
    );

    expect(source.match(/data-invitation-task-save-action/g)).toHaveLength(1);
    expect(source).toContain('data-invitation-workspace-editorial="v1"');
    expect(source).toContain('data-invitation-editorial-editor');
    expect(source).toContain('data-invitation-editorial-preview');
    expect(source.match(/label: '([^']+)'/g)).toHaveLength(11);
    expect(source).not.toContain('data-workspace-task');
    expect(source).toContain('data-invitation-single-task-form');
  });

  it('keeps gallery visibility available inside the concrete media task', () => {
    const source = readFileSync(
      'src/components/projects/invitation-studio-media-mode.tsx',
      'utf8',
    );

    expect(source).toContain('data-media-gallery-visibility-control');
    expect(source).toContain("type: 'gallery-visibility'");
    expect(source).toContain('role="switch"');
  });

  it('removes the global centered shell cap from the owner dashboard', () => {
    const source = readFileSync('src/components/dashboard/dashboard-shell.tsx', 'utf8');

    expect(source).toContain('data-dashboard-full-screen');
    expect(source).not.toContain('max-w-[var(--seraya-shell-max)]');
    expect(source).toContain('data-dashboard-main');
  });

  it('uses container-aware three-zone geometry and responsive editorial stacking', () => {
    const source = readFileSync(
      'src/components/projects/invitation-task-workspace.module.css',
      'utf8',
    );

    expect(source).toContain('container-type: inline-size');
    expect(source).toContain(
      'grid-template-columns: minmax(10.75rem, 12.25rem) minmax(0, 1fr) minmax(17.5rem, 20rem);',
    );
    expect(source).toContain('@container (max-width: 72rem)');
    expect(source).toContain('@container (max-width: 52rem)');
    expect(source).toContain('@container (max-width: 38rem)');
  });
});
