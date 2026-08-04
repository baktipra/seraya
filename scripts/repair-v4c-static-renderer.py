from pathlib import Path

renderer = Path('src/modules/invitation-templates/invitation-template-renderer.tsx')
renderer.write_text(
    """import { createElement } from 'react';

import type { InvitationTemplateKey } from './core/theme-package.registry';
import type {
  InvitationTemplateRenderContextV1,
  PersonalInvitationPresentationSlotsV1,
} from './core/theme-renderer.types';
import { invitationTemplateRegistry } from './invitation-template.registry';
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
}: Pick<InvitationTemplateRendererProps, 'personalSlots' | 'surface'>): InvitationTemplateRenderContextV1 {
  if (surface !== 'personal') {
    return { surface };
  }

  return { personalSlots, surface };
}

/** Canonical renderer used by preview, generic, and personal invitation surfaces. */
export function InvitationTemplateRenderer({
  invitation,
  personalSlots,
  surface,
  templateKey,
}: InvitationTemplateRendererProps) {
  const renderContext = createRenderContext({ personalSlots, surface });

  return createElement(invitationTemplateRegistry[templateKey], {
    invitation,
    renderContext,
  });
}
""",
    encoding='utf-8',
)

test_path = Path('tests/unit/invitation-theme-package-registry.test.ts')
test_source = test_path.read_text(encoding='utf-8')
test_source = test_source.replace(
    "expect(rendererSource).toContain('getInvitationTemplate(templateKey)');",
    "expect(rendererSource).toContain('invitationTemplateRegistry[templateKey]');",
)
test_path.write_text(test_source, encoding='utf-8')
