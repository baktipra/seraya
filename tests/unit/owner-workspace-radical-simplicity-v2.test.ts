import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('SERAYA Owner Workspace Radical Simplicity Reset V2', () => {
  it('reduces the project start page to three concrete owner destinations', () => {
    const source = read('src/components/projects/project-overview-bootstrap.tsx');

    expect(source).toContain('Mau mengerjakan apa sekarang?');
    expect(source).toContain('Edit undangan');
    expect(source).toContain('Kelola tamu');
    expect(source).toContain('Lihat respons');
    expect(source).toContain('CanonicalInvitationThumbnail');
    expect(source).toContain('GuestRosterVisual');
    expect(source).toContain('ResponseFlowVisual');
    expect(source.match(/<Link className=/g)).toHaveLength(3);
    expect(source).not.toContain('ProjectCompass');
    expect(source).not.toContain('AttentionQueue');
  });

  it('keeps only Undangan, Tamu, and Respons in primary project navigation', () => {
    const source = read('src/components/dashboard/project-navigation.tsx');
    const labels = [...source.matchAll(/label: '([^']+)'/g)].map((match) => match[1]);

    expect(labels).toEqual(['Undangan', 'Tamu', 'Respons']);
    expect(source).toContain("aliases: [`${base}/delivery`, `${base}/follow-up`, `${base}/share`]");
    expect(source).not.toContain("label: 'Ringkasan'");
    expect(source).not.toContain("label: 'Bagikan'");
  });

  it('uses sans typography for operational workspace and keeps serif only on the brand wordmark', () => {
    const shell = read('src/components/dashboard/dashboard-shell.tsx');
    const workspace = read('src/components/projects/invitation-task-workspace.module.css');

    expect(shell).toContain('data-owner-workspace-typography="sans"');
    expect(shell).toContain('className="bg-seraya-canvas min-h-screen w-full font-sans"');
    expect(shell.match(/font-serif/g)).toHaveLength(1);
    expect(workspace).toContain('font-family: var(--font-ui);');
    expect(workspace).not.toContain('font-family: var(--font-editorial)');
  });

  it('replaces equal-weight generic cards with one recommended task and scannable visual rows', () => {
    const source = read('src/components/projects/invitation-task-workspace.tsx');
    const styles = read('src/components/projects/invitation-task-workspace.module.css');

    expect(source).toContain('Lanjutkan di sini');
    expect(source).toContain('data-recommended-task={recommendedTask}');
    expect(source).toContain('CanonicalInvitationThumbnail');
    expect(source).toContain('InvitationTaskGlyph');
    expect(source.match(/number: '\d{2}'/g)).toHaveLength(11);
    expect(source).toContain('data-workspace-task={task.key}');
    expect(styles).toContain('.taskGrid');
    expect(styles).toContain('border-top: 1px solid var(--seraya-border-subtle);');
    expect(styles).not.toContain('box-shadow: var(--seraya-shadow-level-1)');
  });

  it('provides a distinct visual glyph for every canonical invitation task', () => {
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

    expect(source).toContain('export function GuestRosterVisual');
    expect(source).toContain('export function ResponseFlowVisual');
  });

  it('preserves one shared draft and one save authority', () => {
    const source = read('src/components/projects/invitation-task-workspace.tsx');

    expect(source.match(/function SaveAuthority\(/g)).toHaveLength(1);
    expect(source.match(/data-invitation-task-save-action/g)).toHaveLength(1);
    expect(source).toContain('useInvitationStudioState');
    expect(source).toContain('form={studioState.formId}');
    expect(source).toContain('InvitationEditorActivePanel');
  });

  it('keeps the full-screen shell and responsive no-overflow geometry', () => {
    const shell = read('src/components/dashboard/dashboard-shell.tsx');
    const projectStyles = read(
      'src/components/projects/project-overview-bootstrap.module.css',
    );
    const taskStyles = read('src/components/projects/invitation-task-workspace.module.css');

    expect(shell).toContain('data-dashboard-full-screen');
    expect(shell).toContain('data-dashboard-main');
    expect(projectStyles).toContain('@media (max-width: 760px)');
    expect(projectStyles).toContain('@media (max-width: 520px)');
    expect(taskStyles).toContain('@container (max-width: 70rem)');
    expect(taskStyles).toContain('@container (max-width: 48rem)');
    expect(taskStyles).toContain('@container (max-width: 32rem)');
  });
});
