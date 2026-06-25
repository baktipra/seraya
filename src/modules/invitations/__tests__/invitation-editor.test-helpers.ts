import { createDefaultInvitationDraftContent } from '../invitation-draft.defaults';

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
  checked('events.enabled', content.events.enabled);
  text('events.primaryDate', content.events.primaryDate);
  checked('events.ceremony.enabled', content.events.ceremony.enabled);
  text('events.ceremony.title', content.events.ceremony.title);
  text('events.ceremony.date', content.events.ceremony.date);
  text('events.ceremony.startTime', content.events.ceremony.startTime);
  text('events.ceremony.endTime', content.events.ceremony.endTime);
  checked('events.reception.enabled', content.events.reception.enabled);
  text('events.reception.title', content.events.reception.title);
  text('events.reception.date', content.events.reception.date);
  text('events.reception.startTime', content.events.reception.startTime);
  text('events.reception.endTime', content.events.reception.endTime);
  checked('location.enabled', content.location.enabled);
  text('location.venueName', content.location.venueName);
  text('location.address', content.location.address);
  text('location.mapsUrl', content.location.mapsUrl);
  checked('rsvp.enabled', content.rsvp.enabled);
  text('rsvp.heading', content.rsvp.heading);
  text('rsvp.lead', content.rsvp.lead);
  checked('closing.enabled', content.closing.enabled);
  text('closing.message', content.closing.message);
  text('closing.signature', content.closing.signature);

  return formData;
}
