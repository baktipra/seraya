import { describe, expect, it } from 'vitest';

import {
  getInvitationEditorFieldErrors,
  parseInvitationEditorFormData,
} from '../invitation-editor.schema';
import {
  createValidInvitationEditorFormData,
  invitationEditorTestProjectId,
} from './invitation-editor.test-helpers';

describe('SRY-016 invitation editor form boundary', () => {
  it('accepts only the declared editable fields and maps unchecked toggles to false', () => {
    const formData = createValidInvitationEditorFormData();
    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.projectId).toBe(invitationEditorTestProjectId);
      expect(parsed.data.content.eventSchedule.events).toHaveLength(1);
      expect(parsed.data.content.eventSchedule.events[0]?.title).toBe('Akad Nikah');
      expect(parsed.data.content.story.enabled).toBe(false);
    }
  });

  it('reconstructs up to three explicit Amplop Digital account slots without allowing injected fields', () => {
    const formData = createValidInvitationEditorFormData();
    formData.set('digitalGift.enabled', 'true');
    formData.set('digitalGift.accounts.0.id', '11111111-1111-4111-8111-111111111111');
    formData.set('digitalGift.accounts.0.providerName', 'Bank Seraya');
    formData.set('digitalGift.accounts.0.accountHolder', 'Raka Pratama');
    formData.set('digitalGift.accounts.0.accountNumber', '1234 5678-9012');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.content.digitalGift).toEqual({
        accounts: [
          {
            accountHolder: 'Raka Pratama',
            accountNumber: '1234 5678-9012',
            id: '11111111-1111-4111-8111-111111111111',
            providerName: 'Bank Seraya',
          },
        ],
        enabled: true,
        heading: '',
        lead: '',
      });
    }
  });

  it('rejects an Amplop Digital account slot outside the three server-recognized indexes', () => {
    const formData = createValidInvitationEditorFormData();
    formData.set('digitalGift.accounts.3.id', '11111111-1111-4111-8111-111111111111');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(false);
  });

  it('rejects an injected unknown form field before it can enter the draft document', () => {
    const formData = createValidInvitationEditorFormData();
    formData.set('gallery.imageIds', 'attacker-controlled');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(getInvitationEditorFieldErrors(parsed.error)).toEqual({
        form: 'Form undangan tidak valid.',
      });
    }
  });

  it('rejects legacy primary event/location form fields so only eventSchedule can be saved', () => {
    const formData = createValidInvitationEditorFormData();
    formData.set('events.primaryDate', '2040-01-01');
    formData.set('location.mapsUrl', 'https://attacker.example.test');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(getInvitationEditorFieldErrors(parsed.error)).toEqual({
        form: 'Form undangan tidak valid.',
      });
    }
  });

  it('rejects a fifth schedule event and noncontiguous schedule indexes', () => {
    const fifthEvent = createValidInvitationEditorFormData();
    for (const key of [
      'id',
      'title',
      'date',
      'startTime',
      'endTime',
      'venueName',
      'venueAddress',
      'mapsUrl',
    ]) {
      fifthEvent.set(
        `eventSchedule.events.4.${key}`,
        key === 'id' ? '11111111-1111-4111-8111-111111111111' : 'x',
      );
    }

    expect(parseInvitationEditorFormData(fifthEvent).success).toBe(false);

    const noncontiguous = createValidInvitationEditorFormData();
    for (const key of [
      'id',
      'title',
      'date',
      'startTime',
      'endTime',
      'venueName',
      'venueAddress',
      'mapsUrl',
    ]) {
      noncontiguous.set(
        `eventSchedule.events.2.${key}`,
        key === 'id' ? '11111111-1111-4111-8111-111111111111' : 'x',
      );
    }

    expect(parseInvitationEditorFormData(noncontiguous).success).toBe(false);
  });

  it('rejects an unsupported template key before it can reach the active draft', () => {
    const formData = createValidInvitationEditorFormData();
    formData.set('templateKey', 'unknown-template');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(getInvitationEditorFieldErrors(parsed.error).templateKey).toBeDefined();
    }
  });

  it('rejects duplicate form values instead of accepting an ambiguous client submission', () => {
    const formData = createValidInvitationEditorFormData();
    formData.append('hero.title', 'Nama lain');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(false);
  });
});
