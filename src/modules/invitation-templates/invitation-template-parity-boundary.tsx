import type { InvitationTemplateId } from './invitation-template.types';
import type {
  InvitationTemplateComponent,
  InvitationTemplateProps,
  InvitationTemplateRenderContextV1,
} from './invitation-template.types';
import { getInvitationTemplateParityDescriptor } from './invitation-template-parity';

import styles from './invitation-template-parity-boundary.module.css';

function getParitySafeRenderContext(
  renderContext: InvitationTemplateRenderContextV1,
): InvitationTemplateRenderContextV1 {
  if (renderContext.surface === 'personal') {
    return renderContext;
  }

  return {
    surface: renderContext.surface,
  };
}

/**
 * Collection-level guardrail shared by every guest template.
 *
 * It never owns art direction or invitation content. It strips accidental
 * personal slots from non-personal surfaces and supplies only neutral layout
 * resilience that should be identical across the collection.
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
      </div>
    );
  };
}
