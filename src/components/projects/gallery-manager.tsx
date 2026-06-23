/* eslint-disable @next/next/no-img-element -- SRY-009 uses explicit authenticated binary proxy routes; image optimization/CDN work is out of scope. */
'use client';

import Link from 'next/link';
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
  MAX_GALLERY_IMAGE_BYTES,
  MAX_GALLERY_IMAGES,
  type InvitationGalleryImage,
} from '@/modules/media/media.types';

type GalleryManagerProps = {
  initialImages: InvitationGalleryImage[];
  isPublished: boolean;
  projectId: string;
};

type ReserveResponse = {
  assetId?: string;
  message?: string;
  signedUploadUrl?: string;
};

type FinalizeResponse = {
  image?: InvitationGalleryImage;
  message?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function uploadDirectlyToSignedUrl(signedUploadUrl: string, file: File) {
  const uploadForm = new FormData();
  uploadForm.append('cacheControl', '3600');
  uploadForm.append('', file);

  const response = await fetch(signedUploadUrl, {
    body: uploadForm,
    headers: { 'x-upsert': 'false' },
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error('SIGNED_UPLOAD_FAILED');
  }
}

export function GalleryManager({ initialImages, isPublished, projectId }: GalleryManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initialImages);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || isUploading) {
      return;
    }

    if (images.length >= MAX_GALLERY_IMAGES) {
      setUploadMessage('Galeri undangan maksimal berisi 12 foto.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadMessage('Pilih file JPEG, PNG, atau WebP.');
      return;
    }

    if (file.size <= 0 || file.size > MAX_GALLERY_IMAGE_BYTES) {
      setUploadMessage('Ukuran foto maksimal 10 MB.');
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    let assetId: string | null = null;

    try {
      const reserveResponse = await fetch(`/api/projects/${projectId}/gallery/reserve`, {
        body: JSON.stringify({ mimeType: file.type, sizeBytes: file.size }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const reservation = await readJson<ReserveResponse>(reserveResponse);

      if (!reserveResponse.ok || !reservation.assetId || !reservation.signedUploadUrl) {
        throw new Error(
          reservation.message ?? 'Foto belum bisa disiapkan. Coba lagi beberapa saat lagi.',
        );
      }

      assetId = reservation.assetId;
      await uploadDirectlyToSignedUrl(reservation.signedUploadUrl, file);

      const finalizeResponse = await fetch(`/api/projects/${projectId}/gallery/finalize`, {
        body: JSON.stringify({ assetId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const finalized = await readJson<FinalizeResponse>(finalizeResponse);

      if (!finalizeResponse.ok || !finalized.image) {
        throw new Error(finalized.message ?? 'Foto belum bisa diselesaikan. Coba unggah lagi.');
      }

      setImages((current) => [...current, finalized.image as InvitationGalleryImage]);
      toast({ title: 'Foto sudah ditambahkan ke galeri.', variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error && error.message !== 'SIGNED_UPLOAD_FAILED'
          ? error.message
          : 'Foto belum bisa diunggah. Coba lagi beberapa saat lagi.';
      setUploadMessage(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove(assetId: string) {
    if (isRemovingId) {
      return;
    }

    setIsRemovingId(assetId);
    setUploadMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/gallery/remove`, {
        body: JSON.stringify({ assetId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = await readJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message ?? 'Foto tidak dapat dihapus dari galeri.');
      }

      setImages((current) => current.filter((image) => image.id !== assetId));
      toast({ title: 'Foto dihapus dari galeri draft.', variant: 'success' });
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : 'Foto tidak dapat dihapus dari galeri.',
      );
    } finally {
      setIsRemovingId(null);
    }
  }

  return (
    <Card aria-labelledby="gallery-manager-title" className="max-w-4xl overflow-hidden">
      <CardHeader className="bg-seraya-brand-soft pb-6 sm:pb-7">
        <CardTitle className="seraya-display-md" id="gallery-manager-title">
          Foto kalian
        </CardTitle>
        <CardDescription className="max-w-xl text-base leading-7">
          Tambahkan foto yang ingin tampil di undangan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="border-seraya-border-default bg-seraya-canvas flex flex-col gap-3 rounded-[var(--seraya-radius-md)] border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-seraya-text-primary text-base font-semibold">
              {images.length} dari {MAX_GALLERY_IMAGES} foto
            </p>
            <p className="text-seraya-text-muted mt-1 text-sm leading-6">
              JPEG, PNG, atau WebP. Maksimal 10 MB per foto.
            </p>
          </div>
          <input
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="gallery-upload-help"
            className="sr-only"
            disabled={isUploading || images.length >= MAX_GALLERY_IMAGES}
            id="gallery-image-upload"
            onChange={handleFileChange}
            type="file"
          />
          <Button
            disabled={images.length >= MAX_GALLERY_IMAGES}
            loading={isUploading}
            onClick={() => fileInputRef.current?.click()}
            size="lg"
            type="button"
          >
            Upload foto
          </Button>
        </div>
        <p className="sr-only" id="gallery-upload-help">
          Hanya gambar JPEG, PNG, atau WebP hingga 10 MB yang dapat diunggah.
        </p>

        {isPublished ? (
          <p className="border-seraya-status-info/25 bg-seraya-status-info-soft text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
            Foto baru akan tampil ke tamu setelah undangan diterbitkan ulang.
          </p>
        ) : null}

        {uploadMessage ? (
          <p className="text-seraya-status-error text-sm leading-6" role="alert">
            {uploadMessage}
          </p>
        ) : null}

        <div aria-live="polite" className="sr-only">
          {isUploading ? 'Foto sedang diunggah.' : ''}
        </div>

        {images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <li className="space-y-2" key={image.id}>
                <div className="border-seraya-border-default bg-seraya-soft aspect-[4/5] overflow-hidden rounded-[var(--seraya-radius-md)] border">
                  <img
                    alt={image.alt}
                    className="size-full object-cover"
                    loading="lazy"
                    src={image.src}
                  />
                </div>
                <Button
                  fullWidth
                  loading={isRemovingId === image.id}
                  onClick={() => handleRemove(image.id)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Hapus dari galeri
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-seraya-border-default rounded-[var(--seraya-radius-md)] border border-dashed px-5 py-10 text-center">
            <p className="text-seraya-text-primary font-semibold">Belum ada foto di galeri.</p>
            <p className="text-seraya-text-muted mt-2 text-sm leading-6">
              Pilih foto pertama kalian untuk mulai mengisi galeri undangan.
            </p>
          </div>
        )}

        <div className="border-seraya-border-default border-t pt-5">
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}`}
          >
            ← Kembali ke project
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
