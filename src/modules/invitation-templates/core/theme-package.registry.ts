import { arunaThemePackage } from '../aruna/aruna.package';
import { larasThemePackage } from '../laras/laras.package';
import { roselleThemePackage } from '../roselle/roselle.package';

export const invitationThemePackageRegistry = Object.freeze({
  roselle: roselleThemePackage,
  aruna: arunaThemePackage,
  laras: larasThemePackage,
});

export type InvitationTemplateKey = keyof typeof invitationThemePackageRegistry;

export const INVITATION_TEMPLATE_KEYS = Object.freeze(
  Object.keys(invitationThemePackageRegistry) as InvitationTemplateKey[],
);

export const DEFAULT_INVITATION_TEMPLATE_KEY: InvitationTemplateKey = 'roselle';

export function isInvitationTemplateKey(value: unknown): value is InvitationTemplateKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(invitationThemePackageRegistry, value)
  );
}

export function resolveInvitationTemplateKey(value: unknown): InvitationTemplateKey {
  return isInvitationTemplateKey(value) ? value : DEFAULT_INVITATION_TEMPLATE_KEY;
}

export function getInvitationThemePackage(templateKey: InvitationTemplateKey) {
  return invitationThemePackageRegistry[templateKey];
}

export const invitationThemePackages = Object.freeze(
  INVITATION_TEMPLATE_KEYS.map((templateKey) => getInvitationThemePackage(templateKey)),
);

export const featuredInvitationThemePackages = Object.freeze(
  invitationThemePackages.filter((themePackage) => themePackage.manifest.featured),
);

export function getDefaultInvitationThemePalette(templateKey: InvitationTemplateKey) {
  const themePackage = getInvitationThemePackage(templateKey);
  const palette = themePackage.palettes.find(
    (candidate) => candidate.key === themePackage.defaultPaletteKey,
  );

  if (!palette) {
    throw new Error('Invitation theme package default palette is unavailable.');
  }

  return palette;
}
