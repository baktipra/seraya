'use client';

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
  INVITATION_AUDIO_CHANGED_EVENT,
  type InvitationAudioChangedEventDetail,
} from '@/modules/media/invitation-audio-playback.types';
import {
  MAX_INVITATION_AUDIO_BYTES,
  SUPPORTED_INVITATION_AUDIO_MIME_TYPES,
  type InvitationAudioMimeType,
  type InvitationAudioSummary,
} from '@/modules/media/invitation-audio.types';

type InvitationAudioManagerProps = {
  embedded?: boolean;
  initialAudio: InvitationAudioSummary | null;
  isPublished: boolean;
  onAudioChange?: (audio: InvitationAudioSummary | null) => void;
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

function announceAudioChange(detail: InvitationAudioChangedEventDetail) {
  window.dispatchEvent(
    new CustomEvent<InvitationAudioChangedEventDetail>(INVITATION_AUDIO_CHANGED_EVENT, { detail }),
  );
}

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
  embedded = false,
  initialAudio,
  isPublished,
  onAudioChange,
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
      onAudioChange?.(finalized.audio);
      announceAudioChange({
        durationSeconds: finalized.audio.durationSeconds,
        enabled: true,
      });
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
      onAudioChange?.(null);
      announceAudioChange({ durationSeconds: null, enabled: false });
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
      className={embedded ? 'w-full overflow-hidden' : 'mb-5 overflow-hidden sm:mb-6'}
      data-invitation-studio-audio-manager={embedded ? 'embedded' : 'standalone'}
      data-v4j-audio-foundation="slice-d"
    >
      <CardHeader className="bg-seraya-brand-soft pb-6">
        <CardTitle className="seraya-display-md" id="invitation-audio-title">
          Audio undangan
        </CardTitle>
        <CardDescription className="max-w-2xl text-base leading-7">
          Siapkan satu audio MP3 atau M4A untuk suasana undangan. Audio tidak diputar otomatis; tamu
          memulainya sendiri melalui kontrol musik yang selalu tersedia.
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
              <Button loading={isRemoving} onClick={handleRemove} type="button" variant="secondary">
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
