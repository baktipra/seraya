import { GuestEventUtility } from './guest-event-utility';
import { getInvitationTemplateParityDescriptor } from './invitation-template-parity';
import type {
  InvitationTemplateComponent,
  InvitationTemplateId,
  InvitationTemplateProps,
  InvitationTemplateRenderContextV1,
} from './invitation-template.types';

import styles from './invitation-template-parity-boundary.module.css';

function getParitySafeRenderContext(
  renderContext: InvitationTemplateRenderContextV1,
): InvitationTemplateRenderContextV1 {
  if (renderContext.surface === 'personal') {
    return renderContext;
  }

  return {
    palette: renderContext.palette,
    surface: renderContext.surface,
  };
}

/**
 * Collection-level guardrail shared by every guest template.
 *
 * It strips accidental personal slots from non-personal surfaces and composes
 * the public-safe V4H utility layer after each template-owned invitation
 * journey. No guest identity, token, RSVP state, or delivery data crosses this
 * boundary.
 */
export function createInvitationTemplateParityBoundary(
  templateId: InvitationTemplateId,
  Template: InvitationTemplateComponent,
): InvitationTemplateComponent {
  const descriptor = getInvitationTemplateParityDescriptor(templateId);

  return function InvitationTemplateParityBoundary({
    invitation,
    renderContext,
  }: InvitationTemplateProps) {
    const paritySafeRenderContext = getParitySafeRenderContext(renderContext);

    return (
      <div
        className={styles.parityBoundary}
        data-invitation-parity="v1"
        data-parity-identity={descriptor.identity}
        data-parity-template={templateId}
        data-surface={renderContext.surface}
      >
        <Template invitation={invitation} renderContext={paritySafeRenderContext} />
        <GuestEventUtility invitation={invitation} templateKey={templateId} />
      </div>
    );
  };
}
