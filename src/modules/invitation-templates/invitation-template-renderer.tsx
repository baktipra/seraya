import { createElement } from 'react';

import type { InvitationTemplateKey } from './core/theme-package.registry';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './core/theme-renderer.types';
import { invitationTemplateRegistry } from './invitation-template.registry';
import type { InvitationViewModel } from './invitation-view-model';

type InvitationTemplateRendererProps = {
  invitation: InvitationViewModel;
  personalSlots?: PersonalInvitationPresentationSlotsV1;
  surface: InvitationTemplateRenderContextV1['surface'];
  templateKey: InvitationTemplateKey;
};

function createRenderContext({
  personalSlots,
  surface,
}: Pick<
  InvitationTemplateRendererProps,
  'personalSlots' | 'surface'
>): InvitationTemplateRenderContextV1 {
  if (surface !== 'personal') {
    return { surface };
  }

  return { personalSlots, surface };
}

/** Canonical renderer used by preview, generic, and personal invitation surfaces. */
export function InvitationTemplateRenderer({
  invitation,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const renderContext = createRenderContext({ personalSlots, surface });

  return createElement(invitationTemplateRegistry[templateKey], {
    invitation,
    renderContext,
  });
}
