'use client';

import { useEffect } from 'react';

import { isInvitationTemplateKey } from '@/modules/invitation-templates/core/theme-package.registry';

export function ProjectTemplatePreselectionBridge() {
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const requestedTemplate = search.get('template');
    const requestedPalette = search.get('palette');

    if (!requestedTemplate || !isInvitationTemplateKey(requestedTemplate)) {
      return undefined;
    }

    const preselectionFrame = window.requestAnimationFrame(() => {
      const option = [
        ...document.querySelectorAll<HTMLInputElement>('input[name="templateKey"]'),
      ].find((candidate) => candidate.value === requestedTemplate);

      if (option && !option.checked) {
        option.click();
      }

      if (requestedPalette) {
        const paletteOption = [
          ...document.querySelectorAll<HTMLInputElement>('input[name="paletteKey"]'),
        ].find((candidate) => candidate.value === requestedPalette);
        if (paletteOption && !paletteOption.checked) paletteOption.click();
      }
    });

    return () => window.cancelAnimationFrame(preselectionFrame);
  }, []);

  return null;
}
