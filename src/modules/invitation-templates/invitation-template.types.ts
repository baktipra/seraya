import { DEFAULT_INVITATION_TEMPLATE_KEY } from './core/theme-package.registry';
import type { InvitationTemplateKey } from './core/theme-package.registry';
import type { InvitationTemplateComponent } from './core/theme-renderer.types';

export {
  getPersonalInvitationPresentationSlots,
  type InvitationRenderSurfaceV1,
  type InvitationTemplateComponent,
  type InvitationTemplateProps,
  type InvitationTemplateRenderContextV1,
  type PersonalInvitationPresentationSlotsV1,
} from './core/theme-renderer.types';

/** Backward-compatible alias retained for existing preview imports. */
export const DEFAULT_PREVIEW_TEMPLATE_ID = DEFAULT_INVITATION_TEMPLATE_KEY;

export type InvitationTemplateId = InvitationTemplateKey;

export type InvitationTemplateRegistry = Readonly<
  Record<InvitationTemplateId, InvitationTemplateComponent>
>;
