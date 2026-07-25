import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import { createInvitationViewModel } from '@/modules/invitation-templates/invitation-view-model';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

export function createFixtureInvitation(templateKey: InvitationTemplateKey) {
  const content = createDefaultInvitationDraftContent(project);
  content.templateKey = templateKey;
  content.rsvp = {
    enabled: true,
    heading: 'Konfirmasi Kehadiran',
    lead: 'Kami menantikan kabar Anda.',
  };

  return createInvitationViewModel({
    draft: { content },
    project: { event_date_primary: project.event_date_primary },
  });
}
