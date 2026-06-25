import type { InvitationViewModel } from './invitation-view-model';
import type { InvitationTemplateKey } from './invitation-template.keys';
import { ArunaTemplate } from './aruna/aruna-template';
import { LarasTemplate } from './laras/laras-template';
import { RoselleTemplate } from './roselle/roselle-template';

type InvitationTemplateRendererProps = {
  invitation: InvitationViewModel;
  templateKey: InvitationTemplateKey;
};

/**
 * Server-renderable renderer boundary. Template keys are schema-validated before
 * reaching this component; the explicit switch keeps each presentation renderer
 * statically analyzable and avoids unsafe runtime key interpolation.
 */
export function InvitationTemplateRenderer({
  invitation,
  templateKey,
}: InvitationTemplateRendererProps) {
  if (templateKey === 'aruna') {
    return <ArunaTemplate invitation={invitation} />;
  }

  if (templateKey === 'laras') {
    return <LarasTemplate invitation={invitation} />;
  }

  return <RoselleTemplate invitation={invitation} />;
}
