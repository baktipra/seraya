import type { ComponentType } from 'react';

import type { InvitationViewModel } from './invitation-view-model';

/** The preview-only system default. It is not persisted to wedding_projects. */
export const DEFAULT_PREVIEW_TEMPLATE_ID = 'roselle' as const;

export type InvitationTemplateId = typeof DEFAULT_PREVIEW_TEMPLATE_ID;

export type InvitationTemplateProps = {
  invitation: InvitationViewModel;
};

export type InvitationTemplateComponent = ComponentType<InvitationTemplateProps>;

export type InvitationTemplateRegistry = Readonly<
  Record<InvitationTemplateId, InvitationTemplateComponent>
>;
