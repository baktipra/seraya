import type { CSSProperties } from 'react';

import type { InvitationTemplateComponent } from './theme-renderer.types';

export type ThemePaletteVariables = Readonly<
  CSSProperties & {
    [key: `--${string}`]: string | number | undefined;
  }
>;

export type ThemePaletteDescriptor = Readonly<{
  accent: string;
  canvas: string;
  ink: string;
  key: string;
  name: string;
  paper: string;
  soft: string;
  swatch: string;
  variables: ThemePaletteVariables;
}>;

export type ThemeCapabilityContract = Readonly<{
  digitalGift: boolean;
  gallery: boolean;
  guestbook: boolean;
  multiEvent: boolean;
  personalGreeting: boolean;
  rsvp: boolean;
}>;

export const FULL_INVITATION_THEME_CAPABILITIES = Object.freeze({
  digitalGift: true,
  gallery: true,
  guestbook: true,
  multiEvent: true,
  personalGreeting: true,
  rsvp: true,
}) satisfies ThemeCapabilityContract;

export type ThemeParityDescriptor = Readonly<{
  coupleAnchorId: string;
  experienceHook: string;
  experienceValue: string;
  greetingAnchorId: string;
  identity: string;
  invitationTitleId: string;
}>;

export type ThemeMarketingPreviewDescriptor = Readonly<{
  date: string;
  eyebrow: string;
  guestLine: string;
  guestName: string;
  showMonogram?: boolean;
  stageLabel: string;
}>;

export type InvitationThemeManifest<TKey extends string = string> = Readonly<{
  badge: string;
  capabilities: ThemeCapabilityContract;
  description: string;
  featured: boolean;
  key: TKey;
  mood: string;
  moods: readonly string[];
  motif: string;
  name: string;
  parity: ThemeParityDescriptor;
  personality: string;
  preview: ThemeMarketingPreviewDescriptor;
  styles: readonly string[];
}>;

export type InvitationThemePackage<TKey extends string = string> = Readonly<{
  defaultPaletteKey: string;
  manifest: InvitationThemeManifest<TKey>;
  palettes: readonly ThemePaletteDescriptor[];
  Renderer: InvitationTemplateComponent;
}>;

export function defineInvitationThemePackage<const TKey extends string>(
  definition: InvitationThemePackage<TKey>,
): InvitationThemePackage<TKey> {
  if (definition.palettes.length === 0) {
    throw new Error('Invitation theme package must define at least one palette.');
  }

  const paletteKeys = definition.palettes.map((palette) => palette.key);
  if (new Set(paletteKeys).size !== paletteKeys.length) {
    throw new Error('Invitation theme package palette keys must be unique.');
  }

  if (!paletteKeys.includes(definition.defaultPaletteKey)) {
    throw new Error('Invitation theme package default palette must exist in its palette list.');
  }

  return Object.freeze({
    ...definition,
    manifest: Object.freeze(definition.manifest),
    palettes: Object.freeze([...definition.palettes]),
  });
}
