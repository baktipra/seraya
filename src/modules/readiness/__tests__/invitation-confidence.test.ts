import { describe, expect, it } from 'vitest';
import { getInvitationConfidenceStatus } from '../invitation-confidence';

describe('invitation confidence status', () => {
  it('explains unpublished drafts as private previews', () => {
    expect(getInvitationConfidenceStatus('draft_incomplete').description).toContain(
      'preview pribadi',
    );
  });
  it('explains published invitations', () => {
    expect(getInvitationConfidenceStatus('published').primaryAction).toBe('preview');
  });
  it('explains republish impact without changing guest links', () => {
    const state = getInvitationConfidenceStatus('published_with_unpublished_changes');
    expect(state.primaryAction).toBe('republish');
    expect(state.description).toContain('menerbitkan ulang');
  });
});
