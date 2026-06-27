import type { ComponentType, ReactNode } from 'react';

import type { InvitationViewModel } from './invitation-view-model';
import {
  DEFAULT_INVITATION_TEMPLATE_KEY,
  type InvitationTemplateKey,
} from './invitation-template.keys';

/** Backward-compatible alias retained for existing preview imports. */
export const DEFAULT_PREVIEW_TEMPLATE_ID = DEFAULT_INVITATION_TEMPLATE_KEY;

export type InvitationTemplateId = InvitationTemplateKey;

/**
 * A rendering surface controls only presentation composition. It never changes
 * invitation content authority, cache policy, or personal-link authorization.
 */
export type InvitationRenderSurfaceV1 = 'generic' | 'personal' | 'preview';

/**
 * Opaque personal presentation nodes. Templates can place the nodes, but do
 * not receive or inspect the guest capability data used to construct them.
 */
export type PersonalInvitationPresentationSlotsV1 = Readonly<{
  greeting?: ReactNode;
  guestbook?: ReactNode;
  rsvp?: ReactNode;
}>;

export type InvitationTemplateRenderContextV1 = Readonly<{
  personalSlots?: PersonalInvitationPresentationSlotsV1;
  surface: InvitationRenderSurfaceV1;
}>;

/**
 * Returns personal slots only for the authorized personal render surface.
 * Generic and preview renderers deliberately ignore accidental slot input.
 */
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

export type InvitationTemplateRegistry = Readonly<
  Record<InvitationTemplateId, InvitationTemplateComponent>
>;
