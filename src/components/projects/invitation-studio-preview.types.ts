export const invitationStudioPreviewVersions = ['local', 'saved', 'published'] as const;
export const invitationStudioPreviewSurfaces = ['generic', 'personal'] as const;
export const invitationStudioPreviewViewports = ['mobile', 'desktop'] as const;

export type InvitationStudioPreviewVersion = (typeof invitationStudioPreviewVersions)[number];
export type InvitationStudioPreviewSurface = (typeof invitationStudioPreviewSurfaces)[number];
export type InvitationStudioPreviewViewport = (typeof invitationStudioPreviewViewports)[number];

export type InvitationStudioPublicationState =
  | 'draft_incomplete'
  | 'draft_ready_unactivated'
  | 'published'
  | 'published_with_unpublished_changes'
  | 'ready_to_publish';

export function parseInvitationStudioPreviewVersion(
  value: string | string[] | undefined,
  hasPublishedVersion: boolean,
): InvitationStudioPreviewVersion {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === 'published') {
    return hasPublishedVersion ? 'published' : 'saved';
  }

  return candidate === 'saved' ? 'saved' : 'local';
}

export function parseInvitationStudioPreviewSurface(
  value: string | string[] | undefined,
): InvitationStudioPreviewSurface {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'personal' ? 'personal' : 'generic';
}

export function parseInvitationStudioPreviewViewport(
  value: string | string[] | undefined,
): InvitationStudioPreviewViewport {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'desktop' ? 'desktop' : 'mobile';
}

export function getInvitationStudioPreviewVersionLabel(version: InvitationStudioPreviewVersion) {
  switch (version) {
    case 'local':
      return 'Perubahan lokal';
    case 'saved':
      return 'Draf tersimpan';
    case 'published':
      return 'Versi terbit';
  }
}
