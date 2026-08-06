import { describe, expect, it } from 'vitest';

import { getInvitationStudioPublishDecision } from '../../src/components/projects/invitation-studio-publish-mode';

describe('Invitation Studio Slice F publication decision authority', () => {
  it('prioritizes the single canonical decision for every publication state', () => {
    expect(
      getInvitationStudioPublishDecision({
        hasBlocker: false,
        isDirty: true,
        readinessState: 'published_with_unpublished_changes',
      }).kind,
    ).toBe('save-local');

    expect(
      getInvitationStudioPublishDecision({
        hasBlocker: true,
        isDirty: false,
        readinessState: 'ready_to_publish',
      }).kind,
    ).toBe('fix-readiness');

    expect(
      getInvitationStudioPublishDecision({
        hasBlocker: false,
        isDirty: false,
        readinessState: 'draft_ready_unactivated',
      }).kind,
    ).toBe('activate-payment');

    expect(
      getInvitationStudioPublishDecision({
        hasBlocker: false,
        isDirty: false,
        readinessState: 'ready_to_publish',
      }).kind,
    ).toBe('publish-first');

    expect(
      getInvitationStudioPublishDecision({
        hasBlocker: false,
        isDirty: false,
        readinessState: 'published_with_unpublished_changes',
      }).kind,
    ).toBe('republish');

    expect(
      getInvitationStudioPublishDecision({
        hasBlocker: false,
        isDirty: false,
        readinessState: 'published',
      }).kind,
    ).toBe('open-published');
  });

  it('keeps dirty state above readiness and publication actions', () => {
    const decision = getInvitationStudioPublishDecision({
      hasBlocker: true,
      isDirty: true,
      readinessState: 'draft_incomplete',
    });

    expect(decision).toMatchObject({
      kind: 'save-local',
      label: 'Simpan dari header',
      title: 'Simpan perubahan lokal terlebih dahulu.',
    });
  });
});
