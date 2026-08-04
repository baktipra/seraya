'use client';

import { useEffect } from 'react';

const supportedTemplates = new Set(['roselle', 'aruna', 'laras']);

export function ProjectTemplatePreselectionBridge() {
  useEffect(() => {
    const requestedTemplate = new URLSearchParams(window.location.search).get('template');

    if (!requestedTemplate || !supportedTemplates.has(requestedTemplate)) {
      return undefined;
    }

    const preselectionFrame = window.requestAnimationFrame(() => {
      const option = document.querySelector<HTMLInputElement>(
        `input[name="templateKey"][value="${requestedTemplate}"]`,
      );

      if (option && !option.checked) {
        option.click();
      }
    });

    return () => window.cancelAnimationFrame(preselectionFrame);
  }, []);

  return null;
}
