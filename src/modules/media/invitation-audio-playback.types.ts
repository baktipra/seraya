import type { InvitationAudioConfiguration } from './invitation-audio.types';

export const INVITATION_AUDIO_CHANGED_EVENT = 'seraya:invitation-audio-change' as const;

export type InvitationAudioChangedEventDetail = {
  durationSeconds: number | null;
  enabled: boolean;
};

export type InvitationAudioPlaybackCapability = {
  durationSeconds: number;
  requestUrl: string;
};

function isSafeInternalPlaybackUrl(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

/**
 * Builds a public-safe playback capability. It never exposes an asset ID,
 * storage bucket/path, signed URL, or owner/private media metadata.
 */
export function createInvitationAudioPlaybackCapability(input: {
  configuration: InvitationAudioConfiguration;
  requestUrl: string;
}): InvitationAudioPlaybackCapability | undefined {
  const durationSeconds = input.configuration.durationSeconds;

  if (
    !input.configuration.assetId ||
    input.configuration.rightsAcknowledged !== true ||
    !durationSeconds ||
    durationSeconds < 1 ||
    durationSeconds > 600 ||
    !isSafeInternalPlaybackUrl(input.requestUrl)
  ) {
    return undefined;
  }

  return { durationSeconds, requestUrl: input.requestUrl };
}
