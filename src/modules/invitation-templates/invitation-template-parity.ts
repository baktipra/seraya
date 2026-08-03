import type { InvitationTemplateId } from './invitation-template.types';

export type InvitationTemplateParityDescriptorV1 = Readonly<{
  coupleAnchorId: string;
  experienceHook: string;
  experienceValue: string;
  greetingAnchorId: string;
  identity: string;
  invitationTitleId: string;
}>;

/**
 * Canonical cross-template parity metadata.
 *
 * This contract deliberately describes shared journey anchors and stable
 * experience authority only. It does not make the three templates visually
 * interchangeable: each identity, composition, rhythm, and CSS authority stays
 * template-owned.
 */
export const invitationTemplateParityV1 = {
  aruna: {
    coupleAnchorId: 'aruna-couple-title',
    experienceHook: 'data-aruna-experience',
    experienceValue: 'journal-v1',
    greetingAnchorId: 'aruna-personal-greeting',
    identity: 'modern-wedding-journal',
    invitationTitleId: 'aruna-invitation-title',
  },
  laras: {
    coupleAnchorId: 'laras-couple-title',
    experienceHook: 'data-laras-experience',
    experienceValue: 'evening-folio-v1',
    greetingAnchorId: 'laras-personal-greeting',
    identity: 'formal-evening-ceremony-folio',
    invitationTitleId: 'laras-invitation-title',
  },
  roselle: {
    coupleAnchorId: 'roselle-couple-title',
    experienceHook: 'data-roselle-experience',
    experienceValue: 'letter-v1',
    greetingAnchorId: 'roselle-personal-greeting',
    identity: 'intimate-romantic-letter',
    invitationTitleId: 'roselle-invitation-title',
  },
} as const satisfies Readonly<Record<InvitationTemplateId, InvitationTemplateParityDescriptorV1>>;

export const invitationTemplateParityIds = Object.freeze(
  Object.keys(invitationTemplateParityV1) as InvitationTemplateId[],
);

export function getInvitationTemplateParityDescriptor(
  templateId: InvitationTemplateId,
): InvitationTemplateParityDescriptorV1 {
  return invitationTemplateParityV1[templateId];
}
