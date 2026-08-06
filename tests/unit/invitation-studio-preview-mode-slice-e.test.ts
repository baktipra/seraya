import { describe, expect, it } from 'vitest';

import { getInvitationStudioPreviewTruth } from '../../src/components/projects/invitation-studio-preview-mode';
import {
  parseInvitationStudioPreviewSurface,
  parseInvitationStudioPreviewVersion,
  parseInvitationStudioPreviewViewport,
} from '../../src/components/projects/invitation-studio-preview.types';

// Final gate preserves distinct local, saved, and immutable published truth.
describe('Invitation Studio Slice E Preview Mode', () => {
  it('parses canonical version, surface, and viewport query state', () => {
    expect(parseInvitationStudioPreviewVersion('local', true)).toBe('local');
    expect(parseInvitationStudioPreviewVersion('saved', true)).toBe('saved');
    expect(parseInvitationStudioPreviewVersion('published', true)).toBe('published');
    expect(parseInvitationStudioPreviewVersion('published', false)).toBe('saved');
    expect(parseInvitationStudioPreviewVersion('unknown', true)).toBe('local');
    expect(parseInvitationStudioPreviewSurface('personal')).toBe('personal');
    expect(parseInvitationStudioPreviewSurface('unknown')).toBe('generic');
    expect(parseInvitationStudioPreviewViewport('desktop')).toBe('desktop');
    expect(parseInvitationStudioPreviewViewport('unknown')).toBe('mobile');
  });

  it('states local, saved, and published truth without conflating them', () => {
    expect(
      getInvitationStudioPreviewTruth({
        isDirty: true,
        publicationState: 'published_with_unpublished_changes',
        publishedRevision: 3,
        version: 'local',
      }),
    ).toMatchObject({ label: 'Perubahan lokal belum tersimpan', state: 'local-dirty' });

    expect(
      getInvitationStudioPreviewTruth({
        isDirty: false,
        publicationState: 'published_with_unpublished_changes',
        publishedRevision: 3,
        version: 'saved',
      }),
    ).toMatchObject({ label: 'Draf tersimpan', state: 'saved' });

    expect(
      getInvitationStudioPreviewTruth({
        isDirty: false,
        publicationState: 'published',
        publishedRevision: 3,
        version: 'published',
      }),
    ).toMatchObject({ label: 'Versi terbit · Revisi 3', state: 'published' });
  });
});
