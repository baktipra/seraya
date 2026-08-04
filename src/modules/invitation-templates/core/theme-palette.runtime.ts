import type { CSSProperties } from 'react';

import {
  getInvitationThemePackage,
  getInvitationThemePalette,
  type InvitationTemplateKey,
} from './theme-package.registry';

export type InvitationPaletteStyle = CSSProperties & Record<`--invitation-${string}`, string>;

export function getInvitationPaletteRuntime(
  templateKey: InvitationTemplateKey,
  paletteKey: unknown,
) {
  const palette = getInvitationThemePalette(templateKey, paletteKey);
  const themePackage = getInvitationThemePackage(templateKey);
  const style: InvitationPaletteStyle =
    palette.key === themePackage.defaultPaletteKey
      ? {}
      : {
    '--invitation-accent': palette.tokens.accent,
    '--invitation-border': palette.tokens.border,
    '--invitation-canvas': palette.tokens.canvas,
    '--invitation-highlight': palette.tokens.highlight,
    '--invitation-ink': palette.tokens.ink,
    '--invitation-muted': palette.tokens.muted,
    '--invitation-secondary': palette.tokens.secondary,
    '--invitation-surface': palette.tokens.surface,
          '--invitation-wash': palette.tokens.wash,
        };

  return { palette, style };
}
