import { createDefaultInvitationDraftContent } from '../invitation-draft.defaults';
import { createInvitationEditorSubmissionPayload } from '../invitation-editor-local-state';
import { invitationEditorPayloadFieldName } from '../invitation-editor.schema';

export const invitationEditorTestProjectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export function createValidInvitationEditorFormData() {
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Raka',
    person_two_name: 'Nadia',
  });
  const formData = new FormData();
  const text = (name: string, value: string | null) => formData.set(name, value ?? '');
  const checked = (name: string, value: boolean) => {
    if (value) {
      formData.set(name, 'true');
    }
  };

  formData.set('projectId', invitationEditorTestProjectId);
  text('templateKey', content.templateKey);
  text('paletteKey', content.paletteKey);
  text('hero.eyebrow', content.hero.eyebrow);
  text('hero.title', content.hero.title);
  text('hero.subtitle', content.hero.subtitle);
  text('couple.personOne.displayName', content.couple.personOne.displayName);
  text('couple.personOne.fullName', content.couple.personOne.fullName);
  text('couple.personOne.parentLine', content.couple.personOne.parentLine);
  text('couple.personTwo.displayName', content.couple.personTwo.displayName);
  text('couple.personTwo.fullName', content.couple.personTwo.fullName);
  text('couple.personTwo.parentLine', content.couple.personTwo.parentLine);
  checked('story.enabled', content.story.enabled);
  text('story.heading', content.story.heading);
  text('story.body', content.story.body);
  content.eventSchedule.events.forEach((event, index) => {
    text(`eventSchedule.events.${index}.id`, event.id);
    text(`eventSchedule.events.${index}.title`, event.title);
    text(`eventSchedule.events.${index}.date`, event.date);
    text(`eventSchedule.events.${index}.startTime`, event.startTime);
    text(`eventSchedule.events.${index}.endTime`, event.endTime);
    text(`eventSchedule.events.${index}.venueName`, event.venueName);
    text(`eventSchedule.events.${index}.venueAddress`, event.venueAddress);
    text(`eventSchedule.events.${index}.mapsUrl`, event.mapsUrl);
  });
  checked('rsvp.enabled', content.rsvp.enabled);
  text('rsvp.heading', content.rsvp.heading);
  text('rsvp.lead', content.rsvp.lead);
  checked('digitalGift.enabled', content.digitalGift.enabled);
  text('digitalGift.heading', content.digitalGift.heading);
  text('digitalGift.lead', content.digitalGift.lead);
  content.digitalGift.accounts.forEach((account, index) => {
    text(`digitalGift.accounts.${index}.id`, account.id);
    text(`digitalGift.accounts.${index}.providerName`, account.providerName);
    text(`digitalGift.accounts.${index}.accountHolder`, account.accountHolder);
    text(`digitalGift.accounts.${index}.accountNumber`, account.accountNumber);
  });
  checked('closing.enabled', content.closing.enabled);
  text('closing.message', content.closing.message);
  text('closing.signature', content.closing.signature);

  return formData;
}

export function createValidInvitationEditorPayloadFormData() {
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Raka',
    person_two_name: 'Nadia',
  });
  const formData = new FormData();

  formData.set('projectId', invitationEditorTestProjectId);
  formData.set(
    invitationEditorPayloadFieldName,
    JSON.stringify(createInvitationEditorSubmissionPayload(content)),
  );
  // The runtime form keeps only the active chapter mounted. Known visible
  // fields may still accompany the strict payload and are intentionally ignored.
  formData.set('templateKey', content.templateKey);
  formData.set('paletteKey', content.paletteKey);

  return formData;
}
