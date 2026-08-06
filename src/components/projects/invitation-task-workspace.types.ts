import type { InvitationEditorSectionKey } from './invitation-editor-workspace';

export const invitationWorkspaceTaskKeys = [
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
] as const;

export type InvitationWorkspaceTask = (typeof invitationWorkspaceTaskKeys)[number];

export const invitationWorkspaceContentTasks = [
  'couple',
  'opening',
  'schedule',
  'story',
  'gift',
  'rsvp',
  'closing',
] as const satisfies readonly InvitationEditorSectionKey[];

export type InvitationWorkspaceContentTask = (typeof invitationWorkspaceContentTasks)[number];

function getQueryValue(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function isInvitationWorkspaceTask(
  value: string | null | undefined,
): value is InvitationWorkspaceTask {
  return invitationWorkspaceTaskKeys.includes(value as InvitationWorkspaceTask);
}

export function isInvitationWorkspaceContentTask(
  value: InvitationWorkspaceTask | null,
): value is InvitationWorkspaceContentTask {
  return invitationWorkspaceContentTasks.includes(value as InvitationWorkspaceContentTask);
}

export function parseInvitationWorkspaceTask(
  taskValue: string | string[] | null | undefined,
  legacyModeValue?: string | string[] | null,
): InvitationWorkspaceTask | null {
  const task = getQueryValue(taskValue);

  if (isInvitationWorkspaceTask(task)) {
    return task;
  }

  const legacyMode = getQueryValue(legacyModeValue);

  switch (legacyMode) {
    case 'design':
      return 'design';
    case 'media':
      return 'media';
    case 'preview':
      return 'preview';
    case 'publish':
      return 'publish';
    default:
      return null;
  }
}

export function getInvitationWorkspaceTaskFromUrl(url: URL): InvitationWorkspaceTask | null {
  const parsed = parseInvitationWorkspaceTask(
    url.searchParams.get('task'),
    url.searchParams.get('mode'),
  );

  if (parsed) {
    return parsed;
  }

  const legacySection = url.hash.replace('#bagian-', '');

  if (legacySection === 'style') {
    return 'design';
  }

  if (legacySection === 'gallery') {
    return 'media';
  }

  return invitationWorkspaceContentTasks.includes(legacySection as InvitationWorkspaceContentTask)
    ? (legacySection as InvitationWorkspaceContentTask)
    : null;
}
