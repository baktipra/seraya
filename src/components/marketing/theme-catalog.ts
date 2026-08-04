import {
  featuredInvitationThemePackages,
  type InvitationTemplateKey,
} from '@/modules/invitation-templates/core/theme-package.registry';
import type { ThemePaletteDescriptor } from '@/modules/invitation-templates/core/theme-package.types';

export type ThemePalette = ThemePaletteDescriptor;

export type ThemeCatalogItem = {
  badge: string;
  description: string;
  key: InvitationTemplateKey;
  motif: string;
  name: string;
  palettes: readonly ThemePalette[];
  personality: string;
};

export const featuredThemes: readonly ThemeCatalogItem[] = Object.freeze(
  featuredInvitationThemePackages.map((themePackage) => ({
    badge: themePackage.manifest.badge,
    description: themePackage.manifest.description,
    key: themePackage.manifest.key,
    motif: themePackage.manifest.motif,
    name: themePackage.manifest.name,
    palettes: themePackage.palettes,
    personality: themePackage.manifest.personality,
  })),
);
