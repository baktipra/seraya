export const INVITATION_AUDIO_MEDIA_KIND = 'invitation_audio' as const;
export const MAX_INVITATION_AUDIO_BYTES = 15_728_640 as const;
export const MAX_INVITATION_AUDIO_DURATION_SECONDS = 600 as const;

export const SUPPORTED_INVITATION_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
] as const;

export type InvitationAudioMimeType = (typeof SUPPORTED_INVITATION_AUDIO_MIME_TYPES)[number];

export type InvitationAudioConfiguration = {
  assetId: string | null;
  durationSeconds: number | null;
  originalFileName: string | null;
  rightsAcknowledged: boolean;
};

export type InvitationAudioMediaAsset = {
  created_at: string;
  deleted_at: string | null;
  duration_seconds: number | null;
  id: string;
  media_kind: typeof INVITATION_AUDIO_MEDIA_KIND;
  mime_type: InvitationAudioMimeType;
  original_file_name: string | null;
  project_id: string;
  rights_acknowledged_at: string | null;
  size_bytes: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleted';
  storage_bucket: 'invitation-media';
  storage_path: string;
  updated_at: string;
};

export type InvitationAudioSummary = {
  durationSeconds: number;
  id: string;
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  sizeBytes: number;
};

export type InvitationAudioUploadReservation = {
  assetId: string;
  signedUploadUrl: string;
};
