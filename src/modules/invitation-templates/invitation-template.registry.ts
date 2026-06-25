import { ArunaTemplate } from './aruna/aruna-template';
import { LarasTemplate } from './laras/laras-template';
import { RoselleTemplate } from './roselle/roselle-template';
import {
  DEFAULT_PREVIEW_TEMPLATE_ID,
  type InvitationTemplateComponent,
  type InvitationTemplateId,
  type InvitationTemplateRegistry,
} from './invitation-template.types';

export const invitationTemplateRegistry = {
  aruna: ArunaTemplate,
  laras: LarasTemplate,
  roselle: RoselleTemplate,
} satisfies InvitationTemplateRegistry;

export function getInvitationTemplate(
  templateId: InvitationTemplateId = DEFAULT_PREVIEW_TEMPLATE_ID,
): InvitationTemplateComponent {
  return invitationTemplateRegistry[templateId];
}
