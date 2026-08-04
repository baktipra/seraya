import {
  getInvitationThemePackage,
  INVITATION_TEMPLATE_KEYS,
  type InvitationTemplateKey,
} from './core/theme-package.registry';
import type { ThemeParityDescriptor } from './core/theme-package.types';

export type InvitationTemplateParityDescriptorV1 = ThemeParityDescriptor;

export const invitationTemplateParityV1 = Object.freeze(
  Object.fromEntries(
    INVITATION_TEMPLATE_KEYS.map((templateKey) => [
      templateKey,
      getInvitationThemePackage(templateKey).manifest.parity,
    ]),
  ) as Readonly<Record<InvitationTemplateKey, InvitationTemplateParityDescriptorV1>>,
);

export const invitationTemplateParityIds = INVITATION_TEMPLATE_KEYS;

export function getInvitationTemplateParityDescriptor(
  templateId: InvitationTemplateKey,
): InvitationTemplateParityDescriptorV1 {
  return invitationTemplateParityV1[templateId];
}
