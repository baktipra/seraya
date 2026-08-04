import {
  DEFAULT_INVITATION_TEMPLATE_KEY,
  getInvitationThemePackage,
  INVITATION_TEMPLATE_KEYS,
  type InvitationTemplateKey,
} from './core/theme-package.registry';
import { createInvitationTemplateParityBoundary } from './invitation-template-parity-boundary';
import type {
  InvitationTemplateComponent,
  InvitationTemplateRegistry,
} from './invitation-template.types';

export const invitationTemplateRegistry = Object.freeze(
  Object.fromEntries(
    INVITATION_TEMPLATE_KEYS.map((templateKey) => [
      templateKey,
      createInvitationTemplateParityBoundary(
        templateKey,
        getInvitationThemePackage(templateKey).Renderer,
      ),
    ]),
  ) as InvitationTemplateRegistry,
);

/** Compatibility exports retained while consumers migrate to package selectors. */
export const ArunaParityTemplate = invitationTemplateRegistry.aruna;
export const LarasParityTemplate = invitationTemplateRegistry.laras;
export const RoselleParityTemplate = invitationTemplateRegistry.roselle;

export function getInvitationTemplate(
  templateId: InvitationTemplateKey = DEFAULT_INVITATION_TEMPLATE_KEY,
): InvitationTemplateComponent {
  return invitationTemplateRegistry[templateId];
}
