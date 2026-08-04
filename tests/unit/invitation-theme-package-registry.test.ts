import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INVITATION_TEMPLATE_KEY,
  getDefaultInvitationThemePalette,
  getInvitationThemePackage,
  resolveInvitationThemePalette,
  resolveInvitationThemePaletteKey,
  INVITATION_TEMPLATE_KEYS,
  invitationThemePackages,
} from '../../src/modules/invitation-templates/core/theme-package.registry';
import { invitationTemplateParityV1 } from '../../src/modules/invitation-templates/invitation-template-parity';

describe('canonical invitation theme package registry', () => {
  it('owns the complete template key list and default package', () => {
    expect(INVITATION_TEMPLATE_KEYS).toEqual(['roselle', 'aruna', 'laras']);
    expect(getInvitationThemePackage(DEFAULT_INVITATION_TEMPLATE_KEY).manifest.key).toBe(
      DEFAULT_INVITATION_TEMPLATE_KEY,
    );
  });

  it.each(INVITATION_TEMPLATE_KEYS)('%s exposes one complete canonical package', (templateKey) => {
    const themePackage = getInvitationThemePackage(templateKey);
    const defaultPalette = getDefaultInvitationThemePalette(templateKey);

    expect(themePackage.manifest.key).toBe(templateKey);
    expect(themePackage.Renderer).toBeTypeOf('function');
    expect(themePackage.palettes.length).toBeGreaterThanOrEqual(4);
    expect(defaultPalette.key).toBe(themePackage.defaultPaletteKey);
    expect(resolveInvitationThemePaletteKey(templateKey, undefined)).toBe(
      themePackage.defaultPaletteKey,
    );
    expect(resolveInvitationThemePalette(templateKey, 'not-a-palette')).toBe(defaultPalette);
    expect(Object.keys(defaultPalette.variables).length).toBeGreaterThanOrEqual(8);
    expect(themePackage.manifest.capabilities).toEqual({
      digitalGift: true,
      gallery: true,
      guestbook: true,
      multiEvent: true,
      personalGreeting: true,
      rsvp: true,
    });
    expect(invitationTemplateParityV1[templateKey]).toBe(themePackage.manifest.parity);
  });

  it('derives every package collection from the registry without duplicate keys', () => {
    expect(invitationThemePackages.map((themePackage) => themePackage.manifest.key)).toEqual(
      INVITATION_TEMPLATE_KEYS,
    );
    expect(new Set(INVITATION_TEMPLATE_KEYS).size).toBe(INVITATION_TEMPLATE_KEYS.length);
  });

  it('uses registry lookup instead of renderer-specific branches', () => {
    const rendererSource = readFileSync(
      resolve(process.cwd(), 'src/modules/invitation-templates/invitation-template-renderer.tsx'),
      'utf8',
    );

    expect(rendererSource).toContain('resolveInvitationThemePalette(templateKey, paletteKey)');
    expect(rendererSource).toContain('invitationTemplateRegistry[templateKey]');
    expect(rendererSource).not.toContain("templateKey === 'aruna'");
    expect(rendererSource).not.toContain("templateKey === 'laras'");
  });
});
