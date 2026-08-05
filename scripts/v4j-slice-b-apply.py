from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise SystemExit(f"Missing anchor in {path}: {old[:160]!r}")
    write(path, content.replace(old, new, 1))


write(
    "src/modules/media/invitation-audio.types.ts",
    r'''export const INVITATION_AUDIO_MEDIA_KIND = 'invitation_audio' as const;
export const MAX_INVITATION_AUDIO_BYTES = 15_728_640 as const;
export const MAX_INVITATION_AUDIO_DURATION_SECONDS = 600 as const;

export const SUPPORTED_INVITATION_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
] as const;

export type InvitationAudioMimeType =
  (typeof SUPPORTED_INVITATION_AUDIO_MIME_TYPES)[number];

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
''',
)

write(
    "src/modules/media/invitation-audio.validation.ts",
    r'''import { z } from 'zod';

import {
  MAX_INVITATION_AUDIO_BYTES,
  MAX_INVITATION_AUDIO_DURATION_SECONDS,
  SUPPORTED_INVITATION_AUDIO_MIME_TYPES,
  type InvitationAudioMimeType,
} from './invitation-audio.types';

const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fileNamePattern = /^[^\\/\u0000-\u001f]+$/;

export class InvitationAudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationAudioValidationError';
  }
}

export const invitationAudioReservationSchema = z
  .object({
    mimeType: z.enum(SUPPORTED_INVITATION_AUDIO_MIME_TYPES),
    originalFileName: z
      .string()
      .trim()
      .min(1, 'Nama file audio tidak valid.')
      .max(180, 'Nama file audio maksimal 180 karakter.')
      .regex(fileNamePattern, 'Nama file audio tidak valid.'),
    rightsAcknowledged: z.literal(true, {
      error: 'Konfirmasikan bahwa Anda berhak menggunakan audio ini.',
    }),
    sizeBytes: z
      .number()
      .int()
      .positive('File audio tidak boleh kosong.')
      .max(MAX_INVITATION_AUDIO_BYTES, 'Ukuran audio maksimal 15 MB.'),
  })
  .strict()
  .superRefine((value, context) => {
    const lowerName = value.originalFileName.toLowerCase();
    const extensionMatches =
      (value.mimeType === 'audio/mpeg' && lowerName.endsWith('.mp3')) ||
      (value.mimeType !== 'audio/mpeg' && lowerName.endsWith('.m4a'));

    if (!extensionMatches) {
      context.addIssue({
        code: 'custom',
        message: 'Gunakan file MP3 atau M4A yang sesuai dengan formatnya.',
        path: ['originalFileName'],
      });
    }
  });

export const invitationAudioAssetActionSchema = z
  .object({
    assetId: z.string().regex(databaseUuidShape, 'Audio tidak valid.'),
  })
  .strict();

export function getInvitationAudioExtension(mimeType: InvitationAudioMimeType) {
  return mimeType === 'audio/mpeg' ? 'mp3' : 'm4a';
}

function hasMp3Signature(bytes: Uint8Array) {
  if (bytes.length < 3) {
    return false;
  }

  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return true;
  }

  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

function hasM4aSignature(bytes: Uint8Array) {
  if (bytes.length < 12) {
    return false;
  }

  return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
}

export function validateInvitationAudioBytes(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  declaredSizeBytes: number;
  durationSeconds: number | undefined;
}): { durationSeconds: number; mimeType: InvitationAudioMimeType } {
  if (
    input.bytes.byteLength <= 0 ||
    input.bytes.byteLength > MAX_INVITATION_AUDIO_BYTES ||
    input.bytes.byteLength !== input.declaredSizeBytes
  ) {
    throw new InvitationAudioValidationError('Ukuran audio tidak sesuai dengan file yang disiapkan.');
  }

  const isMp3 = hasMp3Signature(input.bytes);
  const isM4a = hasM4aSignature(input.bytes);
  const declaredIsMp3 = input.declaredMimeType === 'audio/mpeg';
  const declaredIsM4a =
    input.declaredMimeType === 'audio/mp4' || input.declaredMimeType === 'audio/x-m4a';

  if ((declaredIsMp3 && !isMp3) || (declaredIsM4a && !isM4a) || (!isMp3 && !isM4a)) {
    throw new InvitationAudioValidationError('Isi file tidak sesuai dengan format MP3 atau M4A.');
  }

  const duration = input.durationSeconds;

  if (
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_INVITATION_AUDIO_DURATION_SECONDS
  ) {
    throw new InvitationAudioValidationError('Durasi audio maksimal 10 menit.');
  }

  return {
    durationSeconds: Math.max(1, Math.round(duration)),
    mimeType: isMp3 ? 'audio/mpeg' : 'audio/mp4',
  };
}
''',
)

write(
    "src/modules/media/invitation-audio.repository.ts",
    r'''import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { INVITATION_MEDIA_BUCKET } from './media.types';
import {
  INVITATION_AUDIO_MEDIA_KIND,
  type InvitationAudioMediaAsset,
  type InvitationAudioMimeType,
} from './invitation-audio.types';

const invitationAudioSelect =
  'id, project_id, storage_bucket, storage_path, media_kind, mime_type, size_bytes, status, duration_seconds, original_file_name, rights_acknowledged_at, created_at, updated_at, deleted_at';

export class InvitationAudioRepositoryError extends Error {
  constructor() {
    super('The invitation audio repository could not complete the request.');
    this.name = 'InvitationAudioRepositoryError';
  }
}

function mapInvitationAudioAsset(record: unknown): InvitationAudioMediaAsset {
  const asset = record as InvitationAudioMediaAsset;

  if (
    !asset ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET ||
    asset.media_kind !== INVITATION_AUDIO_MEDIA_KIND ||
    !['audio/mpeg', 'audio/mp4', 'audio/x-m4a'].includes(asset.mime_type)
  ) {
    throw new InvitationAudioRepositoryError();
  }

  return asset;
}

export async function reserveProcessingInvitationAudioAsset(input: {
  assetId: string;
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  project: OwnedProject;
  sizeBytes: number;
  storagePath: string;
}): Promise<InvitationAudioMediaAsset> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id: input.assetId,
      media_kind: INVITATION_AUDIO_MEDIA_KIND,
      mime_type: input.mimeType,
      original_file_name: input.originalFileName,
      project_id: input.project.id,
      rights_acknowledged_at: new Date().toISOString(),
      size_bytes: input.sizeBytes,
      status: 'processing',
      storage_bucket: INVITATION_MEDIA_BUCKET,
      storage_path: input.storagePath,
    })
    .select(invitationAudioSelect)
    .single();

  if (error || !data) {
    throw new InvitationAudioRepositoryError();
  }

  return mapInvitationAudioAsset(data);
}

export async function getInvitationAudioAssetForVerifiedProjectWithAdmin(
  project: OwnedProject,
  assetId: string,
): Promise<InvitationAudioMediaAsset | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(invitationAudioSelect)
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .maybeSingle();

  if (error) {
    throw new InvitationAudioRepositoryError();
  }

  return data ? mapInvitationAudioAsset(data) : null;
}

export async function getReadyInvitationAudioAssetForVerifiedProject(
  project: OwnedProject,
  assetId: string,
): Promise<InvitationAudioMediaAsset | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(invitationAudioSelect)
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new InvitationAudioRepositoryError();
  }

  return data ? mapInvitationAudioAsset(data) : null;
}

export async function createSignedInvitationAudioUploadUrl(
  asset: InvitationAudioMediaAsset,
): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUploadUrl(asset.storage_path, { upsert: false });

  if (error || !data?.signedUrl) {
    throw new InvitationAudioRepositoryError();
  }

  return data.signedUrl;
}

export async function downloadInvitationAudioBytes(
  asset: InvitationAudioMediaAsset,
): Promise<Blob> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);

  if (error || !data) {
    throw new InvitationAudioRepositoryError();
  }

  return data;
}

export async function markInvitationAudioFailed(
  project: OwnedProject,
  assetId: string,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from('media_assets')
    .update({ status: 'failed' })
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .eq('status', 'processing')
    .is('deleted_at', null);

  if (error) {
    throw new InvitationAudioRepositoryError();
  }
}

export async function finalizeInvitationAudioAssetWithAdmin(input: {
  assetId: string;
  durationSeconds: number;
  mimeType: InvitationAudioMimeType;
  projectId: string;
  sizeBytes: number;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('finalize_invitation_audio_media_asset', {
    target_asset_id: input.assetId,
    target_project_id: input.projectId,
    validated_duration_seconds: input.durationSeconds,
    validated_mime_type: input.mimeType,
    validated_size_bytes: input.sizeBytes,
  });

  if (error) {
    throw new InvitationAudioRepositoryError();
  }
}

export async function removeInvitationAudioAssetWithAdmin(input: {
  assetId: string;
  projectId: string;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('remove_invitation_audio_media_asset', {
    target_asset_id: input.assetId,
    target_project_id: input.projectId,
  });

  if (error) {
    throw new InvitationAudioRepositoryError();
  }
}
''',
)

write(
    "src/modules/media/invitation-audio.service.ts",
    r'''import 'server-only';

import { randomUUID } from 'node:crypto';

import { parseBuffer } from 'music-metadata';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { OwnedProject } from '@/modules/projects/project.repository';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

import { INVITATION_MEDIA_BUCKET } from './media.types';
import {
  createSignedInvitationAudioUploadUrl,
  downloadInvitationAudioBytes,
  finalizeInvitationAudioAssetWithAdmin,
  getInvitationAudioAssetForVerifiedProjectWithAdmin,
  getReadyInvitationAudioAssetForVerifiedProject,
  markInvitationAudioFailed,
  removeInvitationAudioAssetWithAdmin,
} from './invitation-audio.repository';
import {
  INVITATION_AUDIO_MEDIA_KIND,
  type InvitationAudioConfiguration,
  type InvitationAudioMimeType,
  type InvitationAudioSummary,
  type InvitationAudioUploadReservation,
} from './invitation-audio.types';
import {
  getInvitationAudioExtension,
  InvitationAudioValidationError,
  validateInvitationAudioBytes,
} from './invitation-audio.validation';

export class InvitationAudioUnavailableError extends Error {
  constructor() {
    super('The invitation audio is unavailable.');
    this.name = 'InvitationAudioUnavailableError';
  }
}

type InvitationAudioReservationInput = {
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  rightsAcknowledged: true;
  sizeBytes: number;
};

function requireActiveDraft<T>(draft: T | null): T {
  if (!draft) {
    throw new InvitationAudioUnavailableError();
  }

  return draft;
}

function buildOpaqueInvitationAudioStoragePath(input: {
  assetId: string;
  mimeType: InvitationAudioMimeType;
  projectId: string;
}) {
  return `projects/${input.projectId}/audio/${input.assetId}.${getInvitationAudioExtension(
    input.mimeType,
  )}`;
}

function toInvitationAudioSummary(input: {
  durationSeconds: number;
  id: string;
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  sizeBytes: number;
}): InvitationAudioSummary {
  return input;
}

export async function reserveInvitationAudioUploadForCurrentUser(input: {
  projectId: string;
  upload: InvitationAudioReservationInput;
}): Promise<InvitationAudioUploadReservation> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (!input.upload.rightsAcknowledged) {
    throw new InvitationAudioValidationError(
      'Konfirmasikan bahwa Anda berhak menggunakan audio ini.',
    );
  }

  const assetId = randomUUID();
  const storagePath = buildOpaqueInvitationAudioStoragePath({
    assetId,
    mimeType: input.upload.mimeType,
    projectId: project.id,
  });
  const asset = await reserveProcessingInvitationAudioAsset({
    assetId,
    mimeType: input.upload.mimeType,
    originalFileName: input.upload.originalFileName,
    project,
    sizeBytes: input.upload.sizeBytes,
    storagePath,
  });

  try {
    const signedUploadUrl = await createSignedInvitationAudioUploadUrl(asset);
    return { assetId: asset.id, signedUploadUrl };
  } catch (error) {
    await markInvitationAudioFailed(project, asset.id).catch(() => undefined);
    throw error;
  }
}

export async function finalizeInvitationAudioUploadForCurrentUser(input: {
  assetId: string;
  projectId: string;
}): Promise<InvitationAudioSummary> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));
  const asset = await getInvitationAudioAssetForVerifiedProjectWithAdmin(project, input.assetId);

  if (
    !asset ||
    asset.status !== 'processing' ||
    asset.deleted_at !== null ||
    asset.media_kind !== INVITATION_AUDIO_MEDIA_KIND ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET ||
    !asset.original_file_name ||
    !asset.rights_acknowledged_at
  ) {
    throw new InvitationAudioUnavailableError();
  }

  try {
    const blob = await downloadInvitationAudioBytes(asset);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const metadata = await parseBuffer(
      bytes,
      { mimeType: asset.mime_type, size: bytes.byteLength },
      { duration: true, skipCovers: true },
    );
    const validated = validateInvitationAudioBytes({
      bytes,
      declaredMimeType: asset.mime_type,
      declaredSizeBytes: asset.size_bytes,
      durationSeconds: metadata.format.duration,
    });

    await finalizeInvitationAudioAssetWithAdmin({
      assetId: asset.id,
      durationSeconds: validated.durationSeconds,
      mimeType: validated.mimeType,
      projectId: project.id,
      sizeBytes: bytes.byteLength,
    });

    return toInvitationAudioSummary({
      durationSeconds: validated.durationSeconds,
      id: asset.id,
      mimeType: validated.mimeType,
      originalFileName: asset.original_file_name,
      sizeBytes: bytes.byteLength,
    });
  } catch (error) {
    await markInvitationAudioFailed(project, asset.id).catch(() => undefined);

    if (error instanceof InvitationAudioValidationError) {
      throw error;
    }

    throw new InvitationAudioUnavailableError();
  }
}

export async function removeInvitationAudioForCurrentUser(input: {
  assetId: string;
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (draft.content.audio.assetId !== input.assetId) {
    throw new InvitationAudioUnavailableError();
  }

  await removeInvitationAudioAssetWithAdmin({
    assetId: input.assetId,
    projectId: project.id,
  });
}

export async function getInvitationAudioSummaryForVerifiedProject(input: {
  configuration: InvitationAudioConfiguration;
  project: OwnedProject;
}): Promise<InvitationAudioSummary | null> {
  if (!input.configuration.assetId) {
    return null;
  }

  const asset = await getReadyInvitationAudioAssetForVerifiedProject(
    input.project,
    input.configuration.assetId,
  );

  if (
    !asset ||
    !asset.duration_seconds ||
    !asset.original_file_name ||
    !asset.rights_acknowledged_at ||
    asset.duration_seconds !== input.configuration.durationSeconds ||
    input.configuration.originalFileName !== asset.original_file_name ||
    input.configuration.rightsAcknowledged !== true
  ) {
    return null;
  }

  return toInvitationAudioSummary({
    durationSeconds: asset.duration_seconds,
    id: asset.id,
    mimeType: asset.mime_type,
    originalFileName: asset.original_file_name,
    sizeBytes: asset.size_bytes,
  });
}

export async function assertInvitationAudioReadyForVerifiedProject(input: {
  content: Pick<InvitationDraftContent, 'audio'>;
  project: OwnedProject;
}): Promise<void> {
  if (!input.content.audio.assetId) {
    return;
  }

  const summary = await getInvitationAudioSummaryForVerifiedProject({
    configuration: input.content.audio,
    project: input.project,
  });

  if (!summary) {
    throw new InvitationAudioUnavailableError();
  }
}
''',
)

# Fix missing import after writing the service.
replace_once(
    "src/modules/media/invitation-audio.service.ts",
    "  removeInvitationAudioAssetWithAdmin,\n} from './invitation-audio.repository';",
    "  removeInvitationAudioAssetWithAdmin,\n  reserveProcessingInvitationAudioAsset,\n} from './invitation-audio.repository';",
)

write(
    "src/components/projects/invitation-audio-manager.tsx",
    r''''use client';

import { type ChangeEvent, useRef, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from '@/design-system';
import {
  MAX_INVITATION_AUDIO_BYTES,
  SUPPORTED_INVITATION_AUDIO_MIME_TYPES,
  type InvitationAudioMimeType,
  type InvitationAudioSummary,
} from '@/modules/media/invitation-audio.types';

type InvitationAudioManagerProps = {
  initialAudio: InvitationAudioSummary | null;
  isPublished: boolean;
  projectId: string;
};

type ReservationResponse = {
  assetId?: string;
  message?: string;
  signedUploadUrl?: string;
};

type FinalizeResponse = {
  audio?: InvitationAudioSummary;
  message?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function normalizeClientMimeType(file: File): InvitationAudioMimeType | null {
  if ((SUPPORTED_INVITATION_AUDIO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return file.type as InvitationAudioMimeType;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.mp3')) {
    return 'audio/mpeg';
  }
  if (lowerName.endsWith('.m4a')) {
    return 'audio/mp4';
  }
  return null;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatMegabytes(bytes: number) {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

async function uploadDirectlyToSignedUrl(
  signedUploadUrl: string,
  file: File,
  mimeType: InvitationAudioMimeType,
) {
  const normalizedFile =
    file.type === mimeType ? file : new File([file], file.name, { type: mimeType });
  const uploadForm = new FormData();
  uploadForm.append('cacheControl', '3600');
  uploadForm.append('', normalizedFile);

  const response = await fetch(signedUploadUrl, {
    body: uploadForm,
    headers: { 'x-upsert': 'false' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error('SIGNED_UPLOAD_FAILED');
  }
}

export function InvitationAudioManager({
  initialAudio,
  isPublished,
  projectId,
}: InvitationAudioManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audio, setAudio] = useState(initialAudio);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rightsAcknowledged, setRightsAcknowledged] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || isUploading) {
      return;
    }

    const mimeType = normalizeClientMimeType(file);
    if (!mimeType) {
      setMessage('Pilih file MP3 atau M4A.');
      return;
    }

    if (file.size <= 0 || file.size > MAX_INVITATION_AUDIO_BYTES) {
      setMessage('Ukuran audio maksimal 15 MB.');
      return;
    }

    if (!rightsAcknowledged) {
      setMessage('Konfirmasikan hak penggunaan audio sebelum mengunggah.');
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const reserveResponse = await fetch(`/api/projects/${projectId}/audio/reserve`, {
        body: JSON.stringify({
          mimeType,
          originalFileName: file.name,
          rightsAcknowledged: true,
          sizeBytes: file.size,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const reservation = await readJson<ReservationResponse>(reserveResponse);

      if (!reserveResponse.ok || !reservation.assetId || !reservation.signedUploadUrl) {
        throw new Error(
          reservation.message ?? 'Audio belum bisa disiapkan. Coba lagi beberapa saat lagi.',
        );
      }

      await uploadDirectlyToSignedUrl(reservation.signedUploadUrl, file, mimeType);

      const finalizeResponse = await fetch(`/api/projects/${projectId}/audio/finalize`, {
        body: JSON.stringify({ assetId: reservation.assetId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const finalized = await readJson<FinalizeResponse>(finalizeResponse);

      if (!finalizeResponse.ok || !finalized.audio) {
        throw new Error(finalized.message ?? 'Audio belum bisa diselesaikan. Coba unggah lagi.');
      }

      setAudio(finalized.audio);
      toast({
        title: audio ? 'Audio undangan sudah diganti.' : 'Audio undangan sudah disiapkan.',
        variant: 'success',
      });
    } catch (error) {
      setMessage(
        error instanceof Error && error.message !== 'SIGNED_UPLOAD_FAILED'
          ? error.message
          : 'Audio belum bisa diunggah. Coba lagi beberapa saat lagi.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    if (!audio || isRemoving) {
      return;
    }

    setIsRemoving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/audio/remove`, {
        body: JSON.stringify({ assetId: audio.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = await readJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message ?? 'Audio tidak dapat dihapus.');
      }

      setAudio(null);
      toast({ title: 'Audio dihapus dari draf undangan.', variant: 'success' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Audio tidak dapat dihapus.');
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Card
      aria-labelledby="invitation-audio-title"
      className="mb-5 overflow-hidden sm:mb-6"
      data-v4j-audio-foundation="slice-b"
    >
      <CardHeader className="bg-seraya-brand-soft pb-6">
        <CardTitle className="seraya-display-md" id="invitation-audio-title">
          Audio undangan
        </CardTitle>
        <CardDescription className="max-w-2xl text-base leading-7">
          Siapkan satu audio MP3 atau M4A untuk suasana undangan. Audio tidak diputar otomatis;
          kontrol tamu akan ditambahkan pada tahap berikutnya.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {audio ? (
          <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="min-w-0">
              <p className="text-seraya-text-primary truncate font-semibold">
                {audio.originalFileName}
              </p>
              <p className="text-seraya-text-muted mt-1 text-sm leading-6">
                {formatDuration(audio.durationSeconds)} · {formatMegabytes(audio.sizeBytes)} · Siap
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
              <Button
                disabled={!rightsAcknowledged}
                loading={isUploading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="secondary"
              >
                Ganti audio
              </Button>
              <Button
                loading={isRemoving}
                onClick={handleRemove}
                type="button"
                variant="secondary"
              >
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-8 text-center">
            <p className="text-seraya-text-primary font-semibold">Belum ada audio undangan.</p>
            <p className="text-seraya-text-muted mt-2 text-sm leading-6">
              Maksimal 15 MB dan 10 menit. File akan diverifikasi kembali setelah upload.
            </p>
          </div>
        )}

        <label className="border-seraya-border-default bg-seraya-canvas flex items-start gap-3 rounded-[var(--seraya-radius-md)] border p-4 text-sm leading-6">
          <input
            checked={rightsAcknowledged}
            className="mt-1 size-4 shrink-0"
            onChange={(event) => setRightsAcknowledged(event.currentTarget.checked)}
            type="checkbox"
          />
          <span className="text-seraya-text-secondary">
            Saya memiliki hak atau izin untuk menggunakan audio ini pada undangan digital.
          </span>
        </label>

        <input
          ref={fileInputRef}
          accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
          className="sr-only"
          disabled={isUploading}
          onChange={handleFileChange}
          type="file"
        />

        {!audio ? (
          <Button
            disabled={!rightsAcknowledged}
            loading={isUploading}
            onClick={() => fileInputRef.current?.click()}
            size="lg"
            type="button"
          >
            Upload audio
          </Button>
        ) : null}

        {isPublished ? (
          <p className="border-seraya-status-info/25 bg-seraya-status-info-soft text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
            Perubahan audio baru akan sampai ke tamu setelah undangan diterbitkan ulang.
          </p>
        ) : null}

        {message ? (
          <p className="text-seraya-status-error text-sm leading-6" role="alert">
            {message}
          </p>
        ) : null}

        <p className="text-seraya-text-muted text-xs leading-5">
          Seraya tidak menerima URL audio eksternal. File disimpan privat dan hanya dapat dirujuk
          melalui asset milik project ini.
        </p>
      </CardContent>
    </Card>
  );
}
''',
)

route_template = r'''import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  InvitationAudioUnavailableError,
  __SERVICE_IMPORT__,
} from '@/modules/media/invitation-audio.service';
import {
  __SCHEMA_IMPORT__,
  InvitationAudioValidationError,
} from '@/modules/media/invitation-audio.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type AudioRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: AudioRouteProps) {
  const { projectId } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return privateJson({ message: 'Data audio tidak valid.' }, { status: 400 });
  }

  const parsed = __SCHEMA_NAME__.safeParse(payload);
  if (!parsed.success) {
    return privateJson(
      { message: parsed.error.issues[0]?.message ?? 'Data audio tidak valid.' },
      { status: 400 },
    );
  }

  try {
    __SUCCESS_BODY__
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk mengelola audio.' }, { status: 401 });
    }

    if (error instanceof ProjectAccessDeniedError || error instanceof InvitationAudioUnavailableError) {
      return privateJson({ message: 'Audio tidak tersedia untuk undangan ini.' }, { status: 404 });
    }

    if (error instanceof InvitationAudioValidationError) {
      return privateJson({ message: error.message }, { status: 400 });
    }

    console.error('__LOG_MESSAGE__', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson(
      { message: 'Audio belum bisa diproses. Coba lagi beberapa saat lagi.' },
      { status: 500 },
    );
  }
}
'''

write(
    "src/app/api/projects/[projectId]/audio/reserve/route.ts",
    route_template
    .replace("__SERVICE_IMPORT__", "reserveInvitationAudioUploadForCurrentUser")
    .replace("__SCHEMA_IMPORT__", "invitationAudioReservationSchema")
    .replace("__SCHEMA_NAME__", "invitationAudioReservationSchema")
    .replace(
        "__SUCCESS_BODY__",
        """const reservation = await reserveInvitationAudioUploadForCurrentUser({
      projectId,
      upload: parsed.data,
    });
    return privateJson(reservation, { status: 201 });""",
    )
    .replace("__LOG_MESSAGE__", "Seraya invitation audio reserve failed."),
)

write(
    "src/app/api/projects/[projectId]/audio/finalize/route.ts",
    route_template
    .replace("__SERVICE_IMPORT__", "finalizeInvitationAudioUploadForCurrentUser")
    .replace("__SCHEMA_IMPORT__", "invitationAudioAssetActionSchema")
    .replace("__SCHEMA_NAME__", "invitationAudioAssetActionSchema")
    .replace(
        "__SUCCESS_BODY__",
        """const audio = await finalizeInvitationAudioUploadForCurrentUser({
      assetId: parsed.data.assetId,
      projectId,
    });
    return privateJson({ audio });""",
    )
    .replace("__LOG_MESSAGE__", "Seraya invitation audio finalize failed."),
)

write(
    "src/app/api/projects/[projectId]/audio/remove/route.ts",
    route_template
    .replace("__SERVICE_IMPORT__", "removeInvitationAudioForCurrentUser")
    .replace("__SCHEMA_IMPORT__", "invitationAudioAssetActionSchema")
    .replace("__SCHEMA_NAME__", "invitationAudioAssetActionSchema")
    .replace(
        "__SUCCESS_BODY__",
        """await removeInvitationAudioForCurrentUser({
      assetId: parsed.data.assetId,
      projectId,
    });
    return privateJson({ success: true });""",
    )
    .replace("__LOG_MESSAGE__", "Seraya invitation audio removal failed."),
)

write(
    "supabase/migrations/20260805002300_m0023_add_invitation_audio_media_foundation.sql",
    r'''-- SERAYA V4J / M0023
-- Dedicated private invitation-audio media foundation. Extends the existing
-- M0008 reserve -> signed upload -> server validation -> atomic finalize model.

begin;

alter table public.media_assets
  add column duration_seconds integer,
  add column original_file_name text,
  add column rights_acknowledged_at timestamptz;

alter table public.media_assets
  drop constraint media_assets_media_kind_valid,
  drop constraint media_assets_mime_type_valid,
  drop constraint media_assets_size_bytes_valid;

alter table public.media_assets
  add constraint media_assets_media_kind_valid check (
    media_kind in ('gallery_image', 'invitation_audio')
  ),
  add constraint media_assets_mime_type_valid check (
    (media_kind = 'gallery_image' and mime_type in ('image/jpeg', 'image/png', 'image/webp'))
    or
    (media_kind = 'invitation_audio' and mime_type in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a'))
  ),
  add constraint media_assets_size_bytes_valid check (
    size_bytes > 0
    and (
      (media_kind = 'gallery_image' and size_bytes <= 10485760)
      or
      (media_kind = 'invitation_audio' and size_bytes <= 15728640)
    )
  ),
  add constraint media_assets_audio_metadata_valid check (
    duration_seconds is null or duration_seconds between 1 and 600
  ),
  add constraint media_assets_audio_rights_valid check (
    media_kind <> 'invitation_audio'
    or (
      original_file_name is not null
      and length(original_file_name) between 1 and 180
      and rights_acknowledged_at is not null
    )
  ),
  add constraint media_assets_ready_audio_duration_valid check (
    media_kind <> 'invitation_audio'
    or status <> 'ready'::public.media_status
    or duration_seconds is not null
  );

update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a'
  ]::text[]
where id = 'invitation-media';

create or replace function public.enforce_media_asset_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'processing'::public.media_status then
      raise exception using errcode = '22023', message = 'Media assets must begin in processing state.';
    end if;
    return new;
  end if;

  if new.project_id is distinct from old.project_id
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or new.media_kind is distinct from old.media_kind
    or new.original_file_name is distinct from old.original_file_name
    or new.rights_acknowledged_at is distinct from old.rights_acknowledged_at
  then
    raise exception using errcode = '55000', message = 'Media asset identity is immutable.';
  end if;

  if old.status = 'processing'::public.media_status then
    if new.status not in (
      'processing'::public.media_status,
      'ready'::public.media_status,
      'failed'::public.media_status
    ) then
      raise exception using errcode = '22023', message = 'Invalid media asset lifecycle transition.';
    end if;
    return new;
  end if;

  if old.status = 'ready'::public.media_status then
    if new.mime_type is distinct from old.mime_type
      or new.size_bytes is distinct from old.size_bytes
      or new.duration_seconds is distinct from old.duration_seconds
    then
      raise exception using errcode = '55000', message = 'Ready media asset metadata is immutable.';
    end if;

    if new.status not in ('ready'::public.media_status, 'deleted'::public.media_status) then
      raise exception using errcode = '22023', message = 'Invalid media asset lifecycle transition.';
    end if;

    if new.status = 'deleted'::public.media_status and new.deleted_at is null then
      raise exception using errcode = '22023', message = 'Deleted media assets require a deleted timestamp.';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
    or new.mime_type is distinct from old.mime_type
    or new.size_bytes is distinct from old.size_bytes
    or new.duration_seconds is distinct from old.duration_seconds
  then
    raise exception using errcode = '55000', message = 'Failed and deleted media assets are immutable.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_media_asset_lifecycle() from public, anon, authenticated;

create function public.finalize_invitation_audio_media_asset(
  target_project_id uuid,
  target_asset_id uuid,
  validated_mime_type text,
  validated_size_bytes bigint,
  validated_duration_seconds integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_asset public.media_assets%rowtype;
  active_draft public.invitation_drafts%rowtype;
  previous_asset_id uuid;
  previous_asset_id_text text;
  updated_content jsonb;
begin
  if validated_mime_type not in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a') then
    raise exception using errcode = '22023', message = 'Unsupported invitation audio MIME type.';
  end if;
  if validated_size_bytes <= 0 or validated_size_bytes > 15728640 then
    raise exception using errcode = '22023', message = 'Invalid invitation audio file size.';
  end if;
  if validated_duration_seconds <= 0 or validated_duration_seconds > 600 then
    raise exception using errcode = '22023', message = 'Invalid invitation audio duration.';
  end if;

  select * into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.project_id = target_project_id
    and asset.media_kind = 'invitation_audio'
    and asset.deleted_at is null
  for update;

  if not found
    or target_asset.status <> 'processing'::public.media_status
    or target_asset.rights_acknowledged_at is null
    or target_asset.original_file_name is null
  then
    raise exception using errcode = '22023', message = 'Invitation audio is not available for finalization.';
  end if;

  select * into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project_id and draft.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'An active invitation draft is required for audio.';
  end if;

  previous_asset_id_text := active_draft.content #>> '{audio,assetId}';
  if previous_asset_id_text is not null and previous_asset_id_text <> '' then
    begin
      previous_asset_id := previous_asset_id_text::uuid;
    exception when invalid_text_representation then
      previous_asset_id := null;
    end;
  end if;

  update public.media_assets as asset
  set
    duration_seconds = validated_duration_seconds,
    mime_type = validated_mime_type,
    size_bytes = validated_size_bytes,
    status = 'ready'::public.media_status
  where asset.id = target_asset.id;

  updated_content := jsonb_set(
    active_draft.content,
    '{audio}',
    jsonb_build_object(
      'assetId', target_asset.id::text,
      'durationSeconds', validated_duration_seconds,
      'originalFileName', target_asset.original_file_name,
      'rightsAcknowledged', true
    ),
    true
  );

  update public.invitation_drafts as draft
  set content = updated_content
  where draft.id = active_draft.id;

  if previous_asset_id is not null and previous_asset_id <> target_asset.id then
    update public.media_assets as old_asset
    set status = 'deleted'::public.media_status, deleted_at = now()
    where old_asset.id = previous_asset_id
      and old_asset.project_id = target_project_id
      and old_asset.media_kind = 'invitation_audio'
      and old_asset.status = 'ready'::public.media_status
      and old_asset.deleted_at is null;
  end if;
end;
$$;

revoke all on function public.finalize_invitation_audio_media_asset(uuid, uuid, text, bigint, integer)
from public, anon, authenticated;

create function public.remove_invitation_audio_media_asset(
  target_project_id uuid,
  target_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_asset public.media_assets%rowtype;
  active_draft public.invitation_drafts%rowtype;
  current_asset_id text;
begin
  select * into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.project_id = target_project_id
    and asset.media_kind = 'invitation_audio'
    and asset.status = 'ready'::public.media_status
    and asset.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Invitation audio is unavailable.';
  end if;

  select * into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project_id and draft.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'An active invitation draft is required for audio.';
  end if;

  current_asset_id := active_draft.content #>> '{audio,assetId}';
  if current_asset_id is distinct from target_asset.id::text then
    raise exception using errcode = '22023', message = 'Invitation audio is not attached to this draft.';
  end if;

  update public.invitation_drafts as draft
  set content = jsonb_set(
    active_draft.content,
    '{audio}',
    jsonb_build_object(
      'assetId', null,
      'durationSeconds', null,
      'originalFileName', null,
      'rightsAcknowledged', false
    ),
    true
  )
  where draft.id = active_draft.id;

  update public.media_assets as asset
  set status = 'deleted'::public.media_status, deleted_at = now()
  where asset.id = target_asset.id;
end;
$$;

revoke all on function public.remove_invitation_audio_media_asset(uuid, uuid)
from public, anon, authenticated;

create or replace function public.validate_invitation_draft_gallery_media(
  target_project_id uuid,
  draft_content jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  gallery_image_ids jsonb;
  raw_asset_id jsonb;
  asset_id_text text;
  parsed_asset_id uuid;
  matching_asset public.media_assets%rowtype;
  audio_content jsonb;
  audio_asset_id_text text;
  audio_duration integer;
begin
  gallery_image_ids := draft_content #> '{gallery,imageIds}';

  if gallery_image_ids is not null then
    if jsonb_typeof(gallery_image_ids) <> 'array' then
      raise exception using errcode = '22023', message = 'Invitation gallery must contain an image ID array.';
    end if;

    for raw_asset_id in
      select value from jsonb_array_elements(gallery_image_ids) as image_id(value)
    loop
      if jsonb_typeof(raw_asset_id) <> 'string' then
        raise exception using errcode = '22023', message = 'Invitation gallery contains an invalid media ID.';
      end if;

      asset_id_text := raw_asset_id #>> '{}';
      begin
        parsed_asset_id := asset_id_text::uuid;
      exception when invalid_text_representation then
        raise exception using errcode = '22023', message = 'Invitation gallery contains an invalid media ID.';
      end;

      select * into matching_asset from public.media_assets as asset where asset.id = parsed_asset_id;
      if not found
        or matching_asset.project_id <> target_project_id
        or matching_asset.media_kind <> 'gallery_image'
        or matching_asset.status <> 'ready'::public.media_status
        or matching_asset.deleted_at is not null
      then
        raise exception using errcode = '22023', message = 'Invitation gallery contains an unavailable media asset.';
      end if;
    end loop;
  end if;

  audio_content := draft_content -> 'audio';
  if audio_content is null then
    return;
  end if;
  if jsonb_typeof(audio_content) <> 'object' then
    raise exception using errcode = '22023', message = 'Invitation audio configuration is invalid.';
  end if;

  audio_asset_id_text := audio_content ->> 'assetId';
  if audio_asset_id_text is null then
    return;
  end if;
  if coalesce((audio_content ->> 'rightsAcknowledged')::boolean, false) is not true then
    raise exception using errcode = '22023', message = 'Invitation audio requires rights acknowledgement.';
  end if;

  begin
    parsed_asset_id := audio_asset_id_text::uuid;
    audio_duration := (audio_content ->> 'durationSeconds')::integer;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'Invitation audio configuration is invalid.';
  end;

  select * into matching_asset from public.media_assets as asset where asset.id = parsed_asset_id;
  if not found
    or matching_asset.project_id <> target_project_id
    or matching_asset.media_kind <> 'invitation_audio'
    or matching_asset.status <> 'ready'::public.media_status
    or matching_asset.deleted_at is not null
    or matching_asset.rights_acknowledged_at is null
    or matching_asset.duration_seconds is distinct from audio_duration
  then
    raise exception using errcode = '22023', message = 'Invitation audio contains an unavailable media asset.';
  end if;
end;
$$;

revoke all on function public.validate_invitation_draft_gallery_media(uuid, jsonb)
from public, anon, authenticated;

commit;
''',
)

# Draft schema: add a backward-compatible audio configuration.
replace_once(
    "src/modules/invitations/invitation-draft.schema.ts",
    "const createDefaultInvitationOpening = () => ({",
    """const createDefaultInvitationAudio = () => ({
  assetId: null,
  durationSeconds: null,
  originalFileName: null,
  rightsAcknowledged: false,
});

const invitationAudioSchema = z
  .object({
    assetId: z.string().trim().uuid('ID audio tidak valid.').nullable(),
    durationSeconds: z.number().int().min(1).max(600).nullable(),
    originalFileName: nullableText(180, 'Nama file audio'),
    rightsAcknowledged: z.boolean(),
  })
  .strict()
  .superRefine((audio, context) => {
    if (audio.assetId && !audio.rightsAcknowledged) {
      context.addIssue({
        code: 'custom',
        message: 'Audio memerlukan konfirmasi hak penggunaan.',
        path: ['rightsAcknowledged'],
      });
    }

    if (audio.assetId && (!audio.durationSeconds || !audio.originalFileName)) {
      context.addIssue({
        code: 'custom',
        message: 'Metadata audio belum lengkap.',
        path: [audio.durationSeconds ? 'originalFileName' : 'durationSeconds'],
      });
    }

    if (!audio.assetId && (audio.durationSeconds || audio.originalFileName)) {
      context.addIssue({
        code: 'custom',
        message: 'Metadata audio tidak boleh tersimpan tanpa asset.',
        path: ['assetId'],
      });
    }
  });

const createDefaultInvitationOpening = () => ({""",
)
replace_once(
    "src/modules/invitations/invitation-draft.schema.ts",
    "  .object({\n    closing:",
    "  .object({\n    audio: invitationAudioSchema.default(createDefaultInvitationAudio),\n    closing:",
)

replace_once(
    "src/modules/invitations/invitation-draft.defaults.ts",
    "  return invitationDraftContentSchema.parse({\n    closing:",
    """  return invitationDraftContentSchema.parse({
    audio: {
      assetId: null,
      durationSeconds: null,
      originalFileName: null,
      rightsAcknowledged: false,
    },
    closing:""",
)

# Save and publish boundaries re-check the private reference.
replace_once(
    "src/modules/invitations/invitation-editor.service.ts",
    "import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';",
    """import { assertInvitationAudioReadyForVerifiedProject } from '@/modules/media/invitation-audio.service';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';""",
)
replace_once(
    "src/modules/invitations/invitation-editor.service.ts",
    "  if (!parsedContent.success) {\n    throw new InvitationEditorValidationError(getInvitationEditorFieldErrors(parsedContent.error));\n  }\n\n  return updateActiveInvitationDraftForVerifiedProject({",
    """  if (!parsedContent.success) {
    throw new InvitationEditorValidationError(getInvitationEditorFieldErrors(parsedContent.error));
  }

  await assertInvitationAudioReadyForVerifiedProject({
    content: parsedContent.data,
    project: editor.project,
  });

  return updateActiveInvitationDraftForVerifiedProject({""",
)

replace_once(
    "src/modules/publications/publication.service.ts",
    "import { getPaymentOverviewForVerifiedProject } from '@/modules/payments/payment.service';",
    """import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import { assertInvitationAudioReadyForVerifiedProject } from '@/modules/media/invitation-audio.service';
import { getPaymentOverviewForVerifiedProject } from '@/modules/payments/payment.service';""",
)
replace_once(
    "src/modules/publications/publication.service.ts",
    "  const previousSnapshot = await getCurrentPublishedInvitationForVerifiedProject(project);\n  const snapshot = await publishInvitationSnapshot(projectId);",
    """  const activeDraft = await getActiveInvitationDraftForVerifiedProject(project);
  if (activeDraft) {
    await assertInvitationAudioReadyForVerifiedProject({
      content: activeDraft.content,
      project,
    });
  }

  const previousSnapshot = await getCurrentPublishedInvitationForVerifiedProject(project);
  const snapshot = await publishInvitationSnapshot(projectId);""",
)

# Invitation studio mounts the separate owner audio manager above the editor.
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx",
    "import { InvitationEditor } from '@/components/projects/invitation-editor';",
    """import { InvitationAudioManager } from '@/components/projects/invitation-audio-manager';
import { InvitationEditor } from '@/components/projects/invitation-editor';""",
)
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx",
    "import type { InvitationGalleryImage } from '@/modules/media/media.types';",
    """import { getInvitationAudioSummaryForVerifiedProject } from '@/modules/media/invitation-audio.service';
import type { InvitationAudioSummary } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';""",
)
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx",
    "type InvitationEditorScreen = {\n  editor: OwnedInvitationEditor;",
    "type InvitationEditorScreen = {\n  audio: InvitationAudioSummary | null;\n  editor: OwnedInvitationEditor;",
)
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx",
    "        const readiness = await getInvitationReadinessForVerifiedProject(project, {\n          draft: editor.draft,\n        });\n\n        return {\n          editor,",
    """        const readiness = await getInvitationReadinessForVerifiedProject(project, {
          draft: editor.draft,
        });
        const audio = await getInvitationAudioSummaryForVerifiedProject({
          configuration: editor.draft.content.audio,
          project,
        });

        return {
          audio,
          editor,""",
)
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx",
    "        <InvitationEditor\n          draft={screen.editor.draft}",
    """        <InvitationAudioManager
          initialAudio={screen.audio}
          isPublished={screen.editor.project.status === 'published'}
          projectId={screen.editor.project.id}
        />
        <InvitationEditor
          draft={screen.editor.draft}""",
)

write(
    "tests/unit/invitation-audio-media-v4j.test.ts",
    r'''import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';
import {
  MAX_INVITATION_AUDIO_BYTES,
  MAX_INVITATION_AUDIO_DURATION_SECONDS,
} from '@/modules/media/invitation-audio.types';
import {
  invitationAudioReservationSchema,
  validateInvitationAudioBytes,
} from '@/modules/media/invitation-audio.validation';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-05-12',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

describe('V4J Slice B invitation audio media foundation', () => {
  it('keeps legacy drafts compatible with a disabled audio default', () => {
    const content = createDefaultInvitationDraftContent(project);
    const legacy = { ...content } as Record<string, unknown>;
    delete legacy.audio;

    const parsed = invitationDraftContentSchema.parse(legacy);
    expect(parsed.audio).toEqual({
      assetId: null,
      durationSeconds: null,
      originalFileName: null,
      rightsAcknowledged: false,
    });
  });

  it('requires coherent asset metadata and rights acknowledgement', () => {
    const content = createDefaultInvitationDraftContent(project);
    expect(() =>
      invitationDraftContentSchema.parse({
        ...content,
        audio: {
          assetId: 'a9f7f69e-4d6f-44d3-a84a-3526f203ebcf',
          durationSeconds: 120,
          originalFileName: 'lagu.mp3',
          rightsAcknowledged: false,
        },
      }),
    ).toThrow(/hak penggunaan/i);
  });

  it('accepts only bounded MP3 and M4A reservations', () => {
    expect(
      invitationAudioReservationSchema.parse({
        mimeType: 'audio/mpeg',
        originalFileName: 'lagu-kami.mp3',
        rightsAcknowledged: true,
        sizeBytes: MAX_INVITATION_AUDIO_BYTES,
      }),
    ).toMatchObject({ mimeType: 'audio/mpeg' });

    expect(() =>
      invitationAudioReservationSchema.parse({
        mimeType: 'audio/ogg',
        originalFileName: 'lagu.ogg',
        rightsAcknowledged: true,
        sizeBytes: 100,
      }),
    ).toThrow();
  });

  it('checks file signatures, exact size, and the ten-minute duration cap', () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0, 0, 0, 0, 0]);
    expect(
      validateInvitationAudioBytes({
        bytes,
        declaredMimeType: 'audio/mpeg',
        declaredSizeBytes: bytes.byteLength,
        durationSeconds: MAX_INVITATION_AUDIO_DURATION_SECONDS,
      }),
    ).toEqual({ durationSeconds: 600, mimeType: 'audio/mpeg' });

    expect(() =>
      validateInvitationAudioBytes({
        bytes,
        declaredMimeType: 'audio/mpeg',
        declaredSizeBytes: bytes.byteLength,
        durationSeconds: 601,
      }),
    ).toThrow(/10 menit/i);
  });

  it('keeps upload, finalize, remove, and publication boundaries private and explicit', () => {
    const migration = readFileSync(
      'supabase/migrations/20260805002300_m0023_add_invitation_audio_media_foundation.sql',
      'utf8',
    );
    const manager = readFileSync(
      'src/components/projects/invitation-audio-manager.tsx',
      'utf8',
    );
    const service = readFileSync('src/modules/media/invitation-audio.service.ts', 'utf8');

    expect(migration).toContain("media_kind in ('gallery_image', 'invitation_audio')");
    expect(migration).toContain('finalize_invitation_audio_media_asset');
    expect(migration).toContain('remove_invitation_audio_media_asset');
    expect(migration).toContain('validate_invitation_draft_gallery_media');
    expect(manager).toContain('Seraya tidak menerima URL audio eksternal');
    expect(service).toContain('parseBuffer');
    expect(service).toContain('assertInvitationAudioReadyForVerifiedProject');
  });
});
''',
)
