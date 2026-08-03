import {
  ArunaParityTemplate,
  LarasParityTemplate,
  RoselleParityTemplate,
} from './invitation-template.registry';
import type { InvitationTemplateKey } from './invitation-template.keys';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './invitation-template.types';
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
  // Personal slots are intentionally dropped for generic and preview surfaces.
  // This keeps accidental route wiring from rendering guest-private UI publicly.
  if (surface !== 'personal') {
    return { surface };
  }

  return { personalSlots, surface };
}

/**
 * Canonical server-renderable collection boundary.
 *
 * The explicit branch keeps all renderer components static for React analysis,
 * while every branch still passes through the parity registry wrappers.
 */
export function InvitationTemplateRenderer({
  invitation,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const renderContext = createRenderContext({ personalSlots, surface });

  return templateKey === 'aruna' ? (
    <ArunaParityTemplate invitation={invitation} renderContext={renderContext} />
  ) : templateKey === 'laras' ? (
    <LarasParityTemplate invitation={invitation} renderContext={renderContext} />
  ) : (
    <RoselleParityTemplate invitation={invitation} renderContext={renderContext} />
  );
}
