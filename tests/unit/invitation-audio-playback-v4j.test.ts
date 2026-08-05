import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';

const readyAudio = {
  assetId: 'a9f7f69e-4d6f-44d3-a84a-3526f203ebcf',
  durationSeconds: 180,
  originalFileName: 'lagu-kami.mp3',
  rightsAcknowledged: true,
};

describe('V4J Slice C guest playback and atmosphere', () => {
  it('creates only opaque internal playback capabilities', () => {
    expect(
      createInvitationAudioPlaybackCapability({
        configuration: readyAudio,
        requestUrl: '/api/invitations/raka-nadia/audio/playback',
      }),
    ).toEqual({
      durationSeconds: 180,
      requestUrl: '/api/invitations/raka-nadia/audio/playback',
    });

    expect(
      createInvitationAudioPlaybackCapability({
        configuration: readyAudio,
        requestUrl: 'https://example.com/audio.mp3',
      }),
    ).toBeUndefined();
  });

  it('does not expose playback for disabled or incoherent audio', () => {
    expect(
      createInvitationAudioPlaybackCapability({
        configuration: { ...readyAudio, assetId: null },
        requestUrl: '/api/invitations/raka-nadia/audio/playback',
      }),
    ).toBeUndefined();
    expect(
      createInvitationAudioPlaybackCapability({
        configuration: { ...readyAudio, rightsAcknowledged: false },
        requestUrl: '/api/invitations/raka-nadia/audio/playback',
      }),
    ).toBeUndefined();
  });

  it('keeps playback interaction-gated with no autoplay or eager source', () => {
    const control = readFileSync('src/components/invitation-audio-playback-control.tsx', 'utf8');

    expect(control).toContain('preload="none"');
    expect(control).not.toContain('autoPlay');
    expect(control).toContain('audio.src = createPlaybackRequestUrl(capability.requestUrl)');
    expect(control).toContain('await audio.play()');
    expect(control).toContain("state === 'playing'");
    expect(control).toContain('audio.muted = true');
  });

  it('uses short-lived no-store redirects instead of exposing storage paths', () => {
    const service = readFileSync('src/modules/media/invitation-audio-playback.service.ts', 'utf8');
    const publicRoute = readFileSync(
      'src/app/api/invitations/[slug]/audio/playback/route.ts',
      'utf8',
    );

    expect(service).toContain('INVITATION_AUDIO_PLAYBACK_TTL_SECONDS = 300');
    expect(service).toContain('getPublicInvitationBySlug');
    expect(service).not.toContain('guestDisplayName');
    expect(publicRoute).toContain("'Cache-Control': 'private, no-store, max-age=0'");
    expect(publicRoute).toContain('NextResponse.redirect');
  });

  it('mounts one shared control across preview, generic, and personal surfaces', () => {
    const renderer = readFileSync(
      'src/modules/invitation-templates/invitation-template-renderer.tsx',
      'utf8',
    );
    const genericPage = readFileSync('src/app/[slug]/page.tsx', 'utf8');
    const personalPage = readFileSync('src/app/[slug]/g/[guestToken]/page.tsx', 'utf8');
    const previewPage = readFileSync(
      'src/app/(dashboard)/dashboard/[projectId]/preview/page.tsx',
      'utf8',
    );

    expect(renderer.match(/InvitationAudioPlaybackControl/g)).toHaveLength(2);
    expect(genericPage).toContain('audioPlayback={createInvitationAudioPlaybackCapability');
    expect(personalPage).toContain('audioPlayback={createInvitationAudioPlaybackCapability');
    expect(previewPage).toContain('audioPlayback={createInvitationAudioPlaybackCapability');
  });
});
