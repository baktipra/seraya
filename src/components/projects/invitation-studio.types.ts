export const invitationStudioModes = [
  {
    description: 'Susun informasi yang akan dibaca tamu.',
    key: 'content',
    label: 'Isi',
  },
  {
    description: 'Atur template dan palet undangan.',
    key: 'design',
    label: 'Desain',
  },
  {
    description: 'Kelola galeri dan audio undangan.',
    key: 'media',
    label: 'Media',
  },
  {
    description: 'Periksa hasil undangan untuk tamu.',
    key: 'preview',
    label: 'Preview',
  },
  {
    description: 'Tinjau kesiapan dan versi yang diterbitkan.',
    key: 'publish',
    label: 'Terbitkan',
  },
] as const;

export type InvitationStudioMode = (typeof invitationStudioModes)[number]['key'];

export function parseInvitationStudioMode(
  value: string | string[] | null | undefined,
): InvitationStudioMode {
  const candidate = Array.isArray(value) ? value[0] : value;

  return invitationStudioModes.some((mode) => mode.key === candidate)
    ? (candidate as InvitationStudioMode)
    : 'content';
}

export function getInvitationStudioModeLabel(mode: InvitationStudioMode) {
  return invitationStudioModes.find((candidate) => candidate.key === mode)?.label ?? 'Isi';
}
