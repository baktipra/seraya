import { createElement } from 'react';

import type { InvitationTemplateKey } from './core/theme-package.registry';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './core/theme-renderer.types';
import { invitationTemplateRegistry } from './invitation-template.registry';
import { getInvitationPaletteRuntime } from './core/theme-palette.runtime';
import type { InvitationViewModel } from './invitation-view-model';

type InvitationTemplateRendererProps = {
  invitation: InvitationViewModel;
  paletteKey?: string;
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
  paletteKey,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const renderContext = createRenderContext({ personalSlots, surface });
  const runtime = getInvitationPaletteRuntime(templateKey, paletteKey);

  return (
    <div
      data-invitation-palette={runtime.palette.key}
      data-invitation-theme={templateKey}
      style={{ display: 'contents', ...runtime.style }}
    >
      {createElement(invitationTemplateRegistry[templateKey], { invitation, renderContext })}
    </div>
  );
}
