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

export const invitationWorkspaceEditorialSectionKeys = [
  'theme',
  'couple',
  'opening',
  'schedule',
  'location',
  'story',
  'gallery',
  'music',
  'gift',
  'rsvp',
  'closing',
] as const;

export type InvitationWorkspaceEditorialSection =
  (typeof invitationWorkspaceEditorialSectionKeys)[number];

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

export function isInvitationWorkspaceEditorialSection(
  value: string | null | undefined,
): value is InvitationWorkspaceEditorialSection {
  return invitationWorkspaceEditorialSectionKeys.includes(
    value as InvitationWorkspaceEditorialSection,
  );
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

function getEditorialSectionForTask(
  task: InvitationWorkspaceTask | null,
): InvitationWorkspaceEditorialSection | null {
  switch (task) {
    case 'design':
      return 'theme';
    case 'media':
      return 'gallery';
    case 'couple':
    case 'opening':
    case 'schedule':
    case 'story':
    case 'gift':
    case 'rsvp':
    case 'closing':
      return task;
    default:
      return null;
  }
}

export function parseInvitationWorkspaceEditorialSection(
  sectionValue: string | string[] | null | undefined,
  taskValue?: string | string[] | null,
  legacyModeValue?: string | string[] | null,
): InvitationWorkspaceEditorialSection {
  const section = getQueryValue(sectionValue);

  if (isInvitationWorkspaceEditorialSection(section)) {
    return section;
  }

  return (
    getEditorialSectionForTask(parseInvitationWorkspaceTask(taskValue, legacyModeValue)) ?? 'theme'
  );
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

export function getInvitationWorkspaceEditorialSectionFromUrl(
  url: URL,
): InvitationWorkspaceEditorialSection {
  const explicitSection = url.searchParams.get('section');

  if (isInvitationWorkspaceEditorialSection(explicitSection)) {
    return explicitSection;
  }

  const taskSection = getEditorialSectionForTask(getInvitationWorkspaceTaskFromUrl(url));
  if (taskSection) return taskSection;

  const legacySection = url.hash.replace('#bagian-', '');
  if (legacySection === 'style') return 'theme';
  if (legacySection === 'gallery') return 'gallery';

  return isInvitationWorkspaceEditorialSection(legacySection) ? legacySection : 'theme';
}
