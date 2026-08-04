import type { ComponentType, ReactNode } from 'react';

import type { InvitationViewModel } from '../invitation-view-model';
import type { ThemePaletteDescriptor } from './theme-package.types';

/** A rendering surface controls presentation composition only. */
export type InvitationRenderSurfaceV1 = 'generic' | 'personal' | 'preview';

/**
 * Opaque personal presentation nodes. Theme renderers may place these nodes,
 * but never receive or inspect the guest capability data used to create them.
 */
export type PersonalInvitationPresentationSlotsV1 = Readonly<{
  greeting?: ReactNode;
  guestbook?: ReactNode;
  rsvp?: ReactNode;
}>;

export type InvitationTemplateRenderContextV1 = Readonly<{
  palette?: ThemePaletteDescriptor;
  personalSlots?: PersonalInvitationPresentationSlotsV1;
  surface: InvitationRenderSurfaceV1;
}>;

/** Generic and preview surfaces deliberately discard personal presentation slots. */
export function getPersonalInvitationPresentationSlots(
  renderContext: InvitationTemplateRenderContextV1,
): PersonalInvitationPresentationSlotsV1 | undefined {
  return renderContext.surface === 'personal' ? renderContext.personalSlots : undefined;
}

export type InvitationTemplateProps = {
  invitation: InvitationViewModel;
  renderContext: InvitationTemplateRenderContextV1;
};

export type InvitationTemplateComponent = ComponentType<InvitationTemplateProps>;
