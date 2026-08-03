import { ArunaTemplate } from './aruna/aruna-template';
import { LarasTemplate } from './laras/laras-template';
import { createInvitationTemplateParityBoundary } from './invitation-template-parity-boundary';
import {
  getInvitationTemplateParityDescriptor,
  invitationTemplateParityIds,
} from './invitation-template-parity';
import { RoselleTemplate } from './roselle/roselle-template';
import {
  DEFAULT_PREVIEW_TEMPLATE_ID,
  type InvitationTemplateComponent,
  type InvitationTemplateId,
  type InvitationTemplateRegistry,
} from './invitation-template.types';

export const invitationTemplateRegistry = {
  aruna: createInvitationTemplateParityBoundary('aruna', ArunaTemplate),
  laras: createInvitationTemplateParityBoundary('laras', LarasTemplate),
  roselle: createInvitationTemplateParityBoundary('roselle', RoselleTemplate),
} satisfies InvitationTemplateRegistry;

const registeredTemplateIds = Object.keys(invitationTemplateRegistry) as InvitationTemplateId[];

if (
  registeredTemplateIds.length !== invitationTemplateParityIds.length ||
  registeredTemplateIds.some((templateId) => !invitationTemplateParityIds.includes(templateId))
) {
  throw new Error('Invitation template registry and parity manifest are out of sync.');
}

export function getInvitationTemplate(
  templateId: InvitationTemplateId = DEFAULT_PREVIEW_TEMPLATE_ID,
): InvitationTemplateComponent {
  getInvitationTemplateParityDescriptor(templateId);
  return invitationTemplateRegistry[templateId];
}
