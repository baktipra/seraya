import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const editor = read('src/components/projects/invitation-editor.tsx');
const workspace = read('src/components/projects/invitation-editor-workspace.tsx');
const preview = read('src/components/projects/invitation-editor-live-preview.tsx');
const route = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const schema = read('src/modules/invitations/invitation-editor.schema.ts');

const activePanelCases = (
  editor.match(/case '(style|opening|couple|story|schedule|gallery|rsvp|gift|closing)':/g) ?? []
).length;

const result = {
  audit: 'P0-A5 Editor Runtime Recovery V1',
  chapterRuntime: {
    activePanelCases,
    inactivePanelsUnmount: workspace.includes('if (!active)') && workspace.includes('return null;'),
    singleRuntimePanelBoundary: (editor.match(/<InvitationEditorActivePanel/g) ?? []).length === 1,
  },
  previewRuntime: {
    debouncedUpdates:
      editor.includes('isLocalPreviewOpen ? 80 : 180') &&
      editor.includes('setPreviewContent(content)'),
    deferredDesktopMount:
      editor.includes("matchMedia('(min-width: 96rem)')") && editor.includes('requestIdleCallback'),
    dynamicChunk:
      editor.includes("import('./invitation-editor-live-preview')") &&
      editor.includes('ssr: false') &&
      !editor.includes('import { InvitationEditorLivePreview }'),
    memoizedRenderer: preview.includes('memo(function InvitationEditorLivePreview'),
  },
  saveBoundary: {
    strictPayload:
      editor.includes('name="editorPayload"') &&
      schema.includes("invitationEditorPayloadFieldName = 'editorPayload'"),
    preservesServerAuthority:
      schema.includes('invitationEditorFormSchema.safeParse') &&
      !schema.includes("gallery: getFormValue(formData, 'gallery"),
  },
  serverLoad: {
    defersGalleryMetadata:
      route.includes('getDeferredGalleryImages') &&
      route.includes('src: `/dashboard/media/${id}`') &&
      !route.includes('getPrivateGalleryImagesForVerifiedProject'),
  },
  telemetry: {
    interactiveReady: editor.includes('invitation_editor_interactive_ready'),
    shellReady: editor.includes('invitation_editor_shell_ready'),
  },
};

const failures = [];
if (activePanelCases !== 9)
  failures.push(`Expected nine active chapter cases, found ${activePanelCases}.`);
if (!result.chapterRuntime.inactivePanelsUnmount) failures.push('Inactive panels remain mounted.');
if (!result.chapterRuntime.singleRuntimePanelBoundary)
  failures.push('Editor does not use one active panel boundary.');
if (!result.previewRuntime.dynamicChunk)
  failures.push('Live preview is not isolated in a dynamic client chunk.');
if (!result.previewRuntime.deferredDesktopMount)
  failures.push('Desktop preview is not deferred to idle time.');
if (!result.previewRuntime.debouncedUpdates)
  failures.push('Preview updates are not buffered from keystrokes.');
if (!result.previewRuntime.memoizedRenderer)
  failures.push('Preview renderer boundary is not memoized.');
if (!result.saveBoundary.strictPayload) failures.push('Strict editor payload boundary is missing.');
if (!result.saveBoundary.preservesServerAuthority)
  failures.push('Editor payload can cross server-owned fields.');
if (!result.serverLoad.defersGalleryMetadata)
  failures.push('Editor route still resolves gallery metadata before render.');
if (!result.telemetry.shellReady || !result.telemetry.interactiveReady) {
  failures.push('Editor shell/interactive telemetry is incomplete.');
}

console.log(
  JSON.stringify({ ...result, failures, status: failures.length ? 'failed' : 'pass' }, null, 2),
);

if (failures.length) process.exitCode = 1;
