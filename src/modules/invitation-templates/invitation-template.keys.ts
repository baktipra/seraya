export const INVITATION_TEMPLATE_KEYS = ['roselle', 'aruna', 'laras'] as const;

export type InvitationTemplateKey = (typeof INVITATION_TEMPLATE_KEYS)[number];

export const DEFAULT_INVITATION_TEMPLATE_KEY: InvitationTemplateKey = 'roselle';

export function isInvitationTemplateKey(value: unknown): value is InvitationTemplateKey {
  return (
    typeof value === 'string' && INVITATION_TEMPLATE_KEYS.includes(value as InvitationTemplateKey)
  );
}

/**
 * Legacy draft and snapshot documents predate a persisted template key. They
 * always resolve to Roselle without mutating the stored historical document.
 */
export function resolveInvitationTemplateKey(value: unknown): InvitationTemplateKey {
  return isInvitationTemplateKey(value) ? value : DEFAULT_INVITATION_TEMPLATE_KEY;
}
