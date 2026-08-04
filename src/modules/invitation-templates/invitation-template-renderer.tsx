import { createElement } from 'react';

import {
  resolveInvitationThemePalette,
  type InvitationTemplateKey,
} from './core/theme-package.registry';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './core/theme-renderer.types';
import { invitationTemplateRegistry } from './invitation-template.registry';
import type { InvitationViewModel } from './invitation-view-model';

type InvitationTemplateRendererProps = {
  invitation: InvitationViewModel;
  paletteKey?: string;
  personalSlots?: PersonalInvitationPresentationSlotsV1;
  surface: InvitationTemplateRenderContextV1['surface'];
  templateKey: InvitationTemplateKey;
};

function createRenderContext({
  paletteKey,
  personalSlots,
  surface,
  templateKey,
}: Pick<
  InvitationTemplateRendererProps,
  'paletteKey' | 'personalSlots' | 'surface' | 'templateKey'
>): InvitationTemplateRenderContextV1 {
  const palette = resolveInvitationThemePalette(templateKey, paletteKey);

  if (surface !== 'personal') {
    return { palette, surface };
  }

  return { palette, personalSlots, surface };
}

/** Canonical renderer used by preview, generic, and personal invitation surfaces. */
export function InvitationTemplateRenderer({
  invitation,
  paletteKey,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const renderContext = createRenderContext({
    paletteKey,
    personalSlots,
    surface,
    templateKey,
  });

  return createElement(invitationTemplateRegistry[templateKey], {
    invitation,
    renderContext,
  });
}
