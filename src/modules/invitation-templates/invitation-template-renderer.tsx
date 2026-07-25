import type { InvitationViewModel } from './invitation-view-model';
import type { InvitationTemplateKey } from './invitation-template.keys';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './invitation-template.types';
import { ArunaTemplate } from './aruna/aruna-template';
import { LarasTemplate } from './laras/laras-template';
import { RoselleTemplate } from './roselle/roselle-template';

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
 * Server-renderable renderer boundary. Template keys are schema-validated before
 * reaching this component; the explicit switch keeps each presentation renderer
 * statically analyzable and avoids unsafe runtime key interpolation.
 */
export function InvitationTemplateRenderer({
  invitation,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const renderContext = createRenderContext({ personalSlots, surface });
  const renderedTemplate =
    templateKey === 'aruna' ? (
      <ArunaTemplate invitation={invitation} renderContext={renderContext} />
    ) : templateKey === 'laras' ? (
      <LarasTemplate invitation={invitation} renderContext={renderContext} />
    ) : (
      <RoselleTemplate invitation={invitation} renderContext={renderContext} />
    );

  return (
    <div data-surface={surface} data-template={templateKey} style={{ display: 'contents' }}>
      {renderedTemplate}
    </div>
  );
}
