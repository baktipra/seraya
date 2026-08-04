'use client';

import { useEffect } from 'react';

import {
  isInvitationTemplateKey,
  isInvitationThemePaletteKey,
} from '@/modules/invitation-templates/core/theme-package.registry';

export function ProjectTemplatePreselectionBridge() {
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const requestedTemplate = search.get('template');
    const requestedPalette = search.get('palette');

    if (!requestedTemplate || !isInvitationTemplateKey(requestedTemplate)) {
      return undefined;
    }

    let paletteFrame: number | undefined;
    const templateFrame = window.requestAnimationFrame(() => {
      const templateOption = [
        ...document.querySelectorAll<HTMLInputElement>('input[name="templateKey"]'),
      ].find((candidate) => candidate.value === requestedTemplate);

      if (templateOption && !templateOption.checked) {
        templateOption.click();
      }

      paletteFrame = window.requestAnimationFrame(() => {
        if (
          !requestedPalette ||
          !isInvitationThemePaletteKey(requestedTemplate, requestedPalette)
        ) {
          return;
        }

        const paletteOption = [
          ...document.querySelectorAll<HTMLInputElement>('input[name="paletteKey"]'),
        ].find((candidate) => candidate.value === requestedPalette);

        if (paletteOption && !paletteOption.checked) {
          paletteOption.click();
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(templateFrame);
      if (paletteFrame !== undefined) {
        window.cancelAnimationFrame(paletteFrame);
      }
    };
  }, []);

  return null;
}
