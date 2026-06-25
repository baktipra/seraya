import type { ComponentType } from 'react';

import type { InvitationViewModel } from './invitation-view-model';
import {
  DEFAULT_INVITATION_TEMPLATE_KEY,
  type InvitationTemplateKey,
} from './invitation-template.keys';

/** Backward-compatible alias retained for existing preview imports. */
export const DEFAULT_PREVIEW_TEMPLATE_ID = DEFAULT_INVITATION_TEMPLATE_KEY;

export type InvitationTemplateId = InvitationTemplateKey;

export type InvitationTemplateProps = {
  invitation: InvitationViewModel;
};

export type InvitationTemplateComponent = ComponentType<InvitationTemplateProps>;

export type InvitationTemplateRegistry = Readonly<
  Record<InvitationTemplateId, InvitationTemplateComponent>
>;
