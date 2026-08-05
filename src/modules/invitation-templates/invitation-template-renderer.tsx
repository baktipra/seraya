import { createElement, Fragment } from 'react';

import { InvitationAudioPlaybackControl } from '@/components/invitation-audio-playback-control';
import type { InvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';

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
  audioPlayback?: InvitationAudioPlaybackCapability;
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
  audioPlayback,
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

  return createElement(
    Fragment,
    null,
    audioPlayback
      ? createElement(InvitationAudioPlaybackControl, {
          capability: audioPlayback,
          surface,
          templateKey,
        })
      : null,
    createElement(invitationTemplateRegistry[templateKey], {
      invitation,
      renderContext,
    }),
  );
}
