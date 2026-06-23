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
      expect(parsed.data.content.events.enabled).toBe(true);
      expect(parsed.data.content.story.enabled).toBe(false);
      expect(parsed.data.content.location.enabled).toBe(false);
    }
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

  it('rejects duplicate form values instead of accepting an ambiguous client submission', () => {
    const formData = createValidInvitationEditorFormData();
    formData.append('hero.title', 'Nama lain');

    const parsed = parseInvitationEditorFormData(formData);

    expect(parsed.success).toBe(false);
  });
});
