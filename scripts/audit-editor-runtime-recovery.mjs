import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const editor = read('src/components/projects/invitation-editor.tsx');
const workspace = read('src/components/projects/invitation-editor-workspace.tsx');
const taskWorkspace = read('src/components/projects/invitation-task-workspace.tsx');
const previewRail = read('src/components/projects/invitation-studio-preview-rail.tsx');
const route = read('src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx');
const schema = read('src/modules/invitations/invitation-editor.schema.ts');

const activePanelCases = (
  editor.match(/case '(opening|couple|story|schedule|gallery|rsvp|gift|closing)':/g) ?? []
).length;

const result = {
  audit: 'P0-A5 Editor Runtime Recovery V1 · Editorial Workspace Compatibility',
  chapterRuntime: {
    activePanelCases,
    inactivePanelsUnmount: workspace.includes('if (!active)') && workspace.includes('return null;'),
    singleRuntimePanelBoundary:
      (taskWorkspace.match(/<InvitationEditorActivePanel/g) ?? []).length === 1,
    themeUsesDedicatedMode: taskWorkspace.includes("activeSection === 'theme'"),
  },
  previewRuntime: {
    bufferedUpdates: previewRail.includes('useDeferredValue(localContent)'),
    deferredMount:
      previewRail.includes('requestIdleCallback') && previewRail.includes('rendererReady'),
    dynamicChunk:
      previewRail.includes("import('@/modules/invitation-templates')") &&
      previewRail.includes('ssr: false') &&
      !previewRail.includes('import { InvitationTemplateRenderer }'),
    memoizedRenderer: previewRail.includes('memo(function PreviewCanvas'),
  },
  saveBoundary: {
    strictPayload:
      taskWorkspace.includes('name="editorPayload"') &&
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
    interactiveReady: previewRail.includes('invitation_editor_interactive_ready'),
    runtimeMarker: previewRail.includes('data-invitation-editor-runtime-ready'),
    shellReady: previewRail.includes('invitation_editor_shell_ready'),
  },
};

const failures = [];
if (activePanelCases !== 8)
  failures.push(`Expected eight content panel cases, found ${activePanelCases}.`);
if (!result.chapterRuntime.inactivePanelsUnmount) failures.push('Inactive panels remain mounted.');
if (!result.chapterRuntime.singleRuntimePanelBoundary)
  failures.push('Editorial workspace does not use one active content panel boundary.');
if (!result.chapterRuntime.themeUsesDedicatedMode)
  failures.push('Theme does not use its dedicated editorial mode.');
if (!result.previewRuntime.dynamicChunk)
  failures.push('Preview renderer is not isolated in a dynamic client chunk.');
if (!result.previewRuntime.deferredMount)
  failures.push('Preview renderer is not deferred to browser idle time.');
if (!result.previewRuntime.bufferedUpdates)
  failures.push('Preview updates are not buffered from direct keystroke rendering.');
if (!result.previewRuntime.memoizedRenderer)
  failures.push('Preview renderer boundary is not memoized.');
if (!result.saveBoundary.strictPayload) failures.push('Strict editor payload boundary is missing.');
if (!result.saveBoundary.preservesServerAuthority)
  failures.push('Editor payload can cross server-owned fields.');
if (!result.serverLoad.defersGalleryMetadata)
  failures.push('Editor route still resolves gallery metadata before render.');
if (
  !result.telemetry.shellReady ||
  !result.telemetry.interactiveReady ||
  !result.telemetry.runtimeMarker
) {
  failures.push('Editorial editor shell/interactive telemetry is incomplete.');
}

console.log(
  JSON.stringify({ ...result, failures, status: failures.length ? 'failed' : 'pass' }, null, 2),
);

if (failures.length) process.exitCode = 1;
