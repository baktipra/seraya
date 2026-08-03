import { getInvitationTemplate } from './invitation-template.registry';
import type { InvitationViewModel } from './invitation-view-model';
import type { InvitationTemplateKey } from './invitation-template.keys';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './invitation-template.types';

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
 * Every route resolves its schema-validated template key through the same
 * registry, so parity hardening and privacy isolation cannot drift between the
 * generic, personal, preview, and showroom render paths.
 */
export function InvitationTemplateRenderer({
  invitation,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const Template = getInvitationTemplate(templateKey);
  const renderContext = createRenderContext({ personalSlots, surface });

  return <Template invitation={invitation} renderContext={renderContext} />;
}
