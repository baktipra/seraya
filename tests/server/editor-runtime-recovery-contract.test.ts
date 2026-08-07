import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const editor = read('src/components/projects/invitation-editor.tsx');
const workspace = read('src/components/projects/invitation-editor-workspace.tsx');
const taskWorkspace = read('src/components/projects/invitation-task-workspace.tsx');
const previewRail = read('src/components/projects/invitation-studio-preview-rail.tsx');
const route = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const schema = read('src/modules/invitations/invitation-editor.schema.ts');
const packageJson = read('package.json');

describe('P0-A5 editor runtime recovery contract', () => {
  it('mounts one active content chapter while theme keeps its dedicated mode and save stays strict', () => {
    expect(
      editor.match(/case '(opening|couple|story|schedule|gallery|rsvp|gift|closing)':/g),
    ).toHaveLength(8);
    expect(taskWorkspace.match(/<InvitationEditorActivePanel/g)).toHaveLength(1);
    expect(taskWorkspace).toContain("activeSection === 'theme'");
    expect(workspace).toContain('if (!active)');
    expect(workspace).toContain('return null;');
    expect(taskWorkspace).toContain('name="editorPayload"');
    expect(schema).toContain("invitationEditorPayloadFieldName = 'editorPayload'");
    expect(schema).toContain('invitationEditorFormSchema.safeParse');
  });

  it('defers, buffers, and chunks the expensive editorial preview without weakening preview truth', () => {
    expect(previewRail).toContain("import('@/modules/invitation-templates')");
    expect(previewRail).toContain('ssr: false');
    expect(previewRail).not.toContain('import { InvitationTemplateRenderer }');
    expect(previewRail).toContain('useDeferredValue(localContent)');
    expect(previewRail).toContain('requestIdleCallback');
    expect(previewRail).toContain('rendererReady');
    expect(previewRail).toContain('memo(function PreviewCanvas');
    expect(previewRail).not.toContain('fetch(');
    expect(previewRail).not.toContain('personalSlots');
  });

  it('keeps owner media validation at the binary route while removing the pre-render metadata query', () => {
    expect(route).toContain('getDeferredGalleryImages');
    expect(route).toContain('src: `/dashboard/media/${id}`');
    expect(route).not.toContain('getPrivateGalleryImagesForVerifiedProject');
    expect(route).toContain('getOwnedProjectContextForRequest');
  });

  it('records separate shell-ready and interactive-ready runtime evidence from the rendered V1 rail', () => {
    expect(previewRail).toContain('invitation_editor_shell_ready');
    expect(previewRail).toContain('invitation_editor_interactive_ready');
    expect(previewRail).toContain('data-invitation-editor-runtime-ready');
    expect(previewRail).not.toContain('localStorage');
  });

  it('executes the repeatable A5 repository audit', () => {
    expect(packageJson).toContain('audit:p0-a5:editor-runtime');

    const output = execFileSync(process.execPath, ['scripts/audit-editor-runtime-recovery.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const result = JSON.parse(output) as { status: string };

    expect(result.status).toBe('pass');
  });
});
