import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const editor = read('src/components/projects/invitation-editor.tsx');
const workspace = read('src/components/projects/invitation-editor-workspace.tsx');
const preview = read('src/components/projects/invitation-editor-live-preview.tsx');
const route = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const schema = read('src/modules/invitations/invitation-editor.schema.ts');
const packageJson = read('package.json');

describe('P0-A5 editor runtime recovery contract', () => {
  it('mounts one active chapter while preserving a strict full-draft submission boundary', () => {
    expect(
      editor.match(/case '(style|opening|couple|story|schedule|gallery|rsvp|gift|closing)':/g),
    ).toHaveLength(9);
    expect(editor.match(/<InvitationEditorActivePanel/g)).toHaveLength(1);
    expect(workspace).toContain('if (!active)');
    expect(workspace).toContain('return null;');
    expect(editor).toContain('name="editorPayload"');
    expect(schema).toContain("invitationEditorPayloadFieldName = 'editorPayload'");
    expect(schema).toContain('invitationEditorFormSchema.safeParse');
  });

  it('defers and buffers the expensive live preview without weakening preview authority', () => {
    expect(editor).toContain("import('./invitation-editor-live-preview')");
    expect(editor).toContain('ssr: false');
    expect(editor).not.toContain('import { InvitationEditorLivePreview }');
    expect(editor).toContain("matchMedia('(min-width: 96rem)')");
    expect(editor).toContain('requestIdleCallback');
    expect(editor).toContain('isLocalPreviewOpen ? 80 : 180');
    expect(preview).toContain('memo(function InvitationEditorLivePreview');
    expect(preview).toContain('surface="preview"');
    expect(preview).not.toContain('fetch(');
    expect(preview).not.toContain('personalSlots');
  });

  it('keeps owner media validation at the binary route while removing the pre-render metadata query', () => {
    expect(route).toContain('getDeferredGalleryImages');
    expect(route).toContain('src: `/dashboard/media/${id}`');
    expect(route).not.toContain('getPrivateGalleryImagesForVerifiedProject');
    expect(route).toContain('getOwnedProjectContextForRequest');
  });

  it('records separate shell-ready and interactive-ready runtime evidence', () => {
    expect(editor).toContain('invitation_editor_shell_ready');
    expect(editor).toContain('invitation_editor_interactive_ready');
    expect(editor).toContain('data-invitation-editor-runtime-ready');
    expect(editor).not.toContain('localStorage');
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
