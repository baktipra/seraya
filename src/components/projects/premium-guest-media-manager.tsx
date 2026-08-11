/* eslint-disable @next/next/no-img-element -- owner-only media proxy routes deliberately bypass public image optimization. */
'use client';

import { type ChangeEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, useToast } from '@/design-system';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationImageRole } from '@/modules/media/invitation-image.types';
import { MAX_GALLERY_IMAGE_BYTES } from '@/modules/media/media.types';

import { useInvitationStudioState } from './invitation-studio-provider';

type ApiMessage = { message?: string };
type ReserveResponse = ApiMessage & { assetId?: string; signedUploadUrl?: string };
type FinalizeResponse = ApiMessage & { image?: { alt: string; id: string; src: string } };
type ConfigurationResponse = ApiMessage & { premiumMedia?: InvitationDraftContent['premiumMedia'] };

const rolePresentation: Array<{
  description: string;
  label: string;
  role: InvitationImageRole;
}> = [
  {
    description: 'Foto pertama yang membentuk kesan awal undangan. Disarankan portrait atau couple portrait dengan ruang untuk judul.',
    label: 'Cover utama',
    role: 'cover',
  },
  {
    description: 'Potret individual untuk profil mempelai pertama.',
    label: 'Mempelai pertama',
    role: 'person_one',
  },
  {
    description: 'Potret individual untuk profil mempelai kedua.',
    label: 'Mempelai kedua',
    role: 'person_two',
  },
  {
    description: 'Foto yang menemani bab cerita pasangan.',
    label: 'Foto cerita',
    role: 'story',
  },
];

function getRoleAssetId(content: InvitationDraftContent, role: InvitationImageRole) {
  switch (role) {
    case 'cover':
      return content.premiumMedia.coverImageId;
    case 'person_one':
      return content.premiumMedia.personOne.imageId;
    case 'person_two':
      return content.premiumMedia.personTwo.imageId;
    case 'story':
      return content.premiumMedia.storyImageId;
  }
}

function setRoleAssetId(
  premiumMedia: InvitationDraftContent['premiumMedia'],
  role: InvitationImageRole,
  assetId: string | null,
): InvitationDraftContent['premiumMedia'] {
  switch (role) {
    case 'cover':
      return { ...premiumMedia, coverImageId: assetId };
    case 'person_one':
      return {
        ...premiumMedia,
        personOne: { ...premiumMedia.personOne, imageId: assetId },
      };
    case 'person_two':
      return {
        ...premiumMedia,
        personTwo: { ...premiumMedia.personTwo, imageId: assetId },
      };
    case 'story':
      return { ...premiumMedia, storyImageId: assetId };
  }
}

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

  if (!response.ok) throw new Error('SIGNED_UPLOAD_FAILED');
}

function inputClassName() {
  return 'border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-md)] border px-3.5 text-sm focus-visible:outline-3 focus-visible:outline-offset-2';
}

export function PremiumGuestMediaManager({
  isPublished,
  projectId,
}: {
  isPublished: boolean;
  projectId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { content, synchronizeLocalContent } = useInvitationStudioState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadRole, setUploadRole] = useState<InvitationImageRole | null>(null);
  const [busyRole, setBusyRole] = useState<InvitationImageRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);
  const [personOneInstagram, setPersonOneInstagram] = useState(content.premiumMedia.personOne.socialLinks.instagram ?? '');
  const [personOneTikTok, setPersonOneTikTok] = useState(content.premiumMedia.personOne.socialLinks.tiktok ?? '');
  const [personOneWebsite, setPersonOneWebsite] = useState(content.premiumMedia.personOne.socialLinks.website ?? '');
  const [personTwoInstagram, setPersonTwoInstagram] = useState(content.premiumMedia.personTwo.socialLinks.instagram ?? '');
  const [personTwoTikTok, setPersonTwoTikTok] = useState(content.premiumMedia.personTwo.socialLinks.tiktok ?? '');
  const [personTwoWebsite, setPersonTwoWebsite] = useState(content.premiumMedia.personTwo.socialLinks.website ?? '');
  const [filmEnabled, setFilmEnabled] = useState(content.premiumMedia.weddingFilm.enabled);
  const [filmHeading, setFilmHeading] = useState(content.premiumMedia.weddingFilm.heading ?? '');
  const [filmUrl, setFilmUrl] = useState(content.premiumMedia.weddingFilm.url ?? '');
  const [filmCaption, setFilmCaption] = useState(content.premiumMedia.weddingFilm.caption ?? '');

  function synchronizePremiumMedia(premiumMedia: InvitationDraftContent['premiumMedia']) {
    synchronizeLocalContent({
      content: { ...content, premiumMedia },
      type: 'replace',
    });
    router.refresh();
  }

  function selectUpload(role: InvitationImageRole) {
    if (busyRole) return;
    setUploadRole(role);
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const role = uploadRole;
    setUploadRole(null);

    if (!file || !role || busyRole) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Pilih file JPEG, PNG, atau WebP.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_GALLERY_IMAGE_BYTES) {
      setMessage('Ukuran foto maksimal 10 MB.');
      return;
    }

    setBusyRole(role);
    setMessage(null);
    try {
      const reserveResponse = await fetch(`/api/projects/${projectId}/featured-media/reserve`, {
        body: JSON.stringify({ mimeType: file.type, role, sizeBytes: file.size }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const reservation = await readJson<ReserveResponse>(reserveResponse);
      if (!reserveResponse.ok || !reservation.assetId || !reservation.signedUploadUrl) {
        throw new Error(reservation.message ?? 'Foto belum bisa disiapkan.');
      }

      await uploadDirectlyToSignedUrl(reservation.signedUploadUrl, file);
      const finalizeResponse = await fetch(`/api/projects/${projectId}/featured-media/finalize`, {
        body: JSON.stringify({ assetId: reservation.assetId, role }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const finalized = await readJson<FinalizeResponse>(finalizeResponse);
      if (!finalizeResponse.ok || !finalized.image) {
        throw new Error(finalized.message ?? 'Foto belum bisa diselesaikan.');
      }

      synchronizePremiumMedia(setRoleAssetId(content.premiumMedia, role, finalized.image.id));
      toast({ title: 'Foto utama undangan diperbarui.', variant: 'success' });
    } catch (error) {
      setMessage(
        error instanceof Error && error.message !== 'SIGNED_UPLOAD_FAILED'
          ? error.message
          : 'Foto belum bisa diunggah. Coba lagi.',
      );
    } finally {
      setBusyRole(null);
    }
  }

  async function removeRole(role: InvitationImageRole, assetId: string) {
    if (busyRole) return;
    setBusyRole(role);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/featured-media/remove`, {
        body: JSON.stringify({ assetId, role }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = await readJson<ApiMessage>(response);
      if (!response.ok) throw new Error(payload.message ?? 'Foto belum bisa dihapus.');

      synchronizePremiumMedia(setRoleAssetId(content.premiumMedia, role, null));
      toast({ title: 'Foto dilepas dari undangan.', variant: 'success' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Foto belum bisa dihapus.');
    } finally {
      setBusyRole(null);
    }
  }

  async function saveConfiguration() {
    if (isSavingConfiguration) return;
    setIsSavingConfiguration(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/featured-media/configuration`, {
        body: JSON.stringify({
          personOneSocialLinks: {
            instagram: personOneInstagram,
            tiktok: personOneTikTok,
            website: personOneWebsite,
          },
          personTwoSocialLinks: {
            instagram: personTwoInstagram,
            tiktok: personTwoTikTok,
            website: personTwoWebsite,
          },
          weddingFilm: {
            caption: filmCaption,
            enabled: filmEnabled,
            heading: filmHeading,
            url: filmUrl,
          },
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = await readJson<ConfigurationResponse>(response);
      if (!response.ok || !payload.premiumMedia) {
        throw new Error(payload.message ?? 'Konfigurasi media belum bisa disimpan.');
      }

      synchronizePremiumMedia(payload.premiumMedia);
      toast({ title: 'Profil media dan Wedding Film tersimpan.', variant: 'success' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Konfigurasi media belum bisa disimpan.');
    } finally {
      setIsSavingConfiguration(false);
    }
  }

  return (
    <div className="space-y-6" data-premium-guest-media-manager="j1.3">
      <input
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        type="file"
      />

      {isPublished ? (
        <p className="border-seraya-status-info/25 bg-seraya-status-info-soft text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
          Perubahan media baru tampil ke tamu setelah undangan diterbitkan ulang.
        </p>
      ) : null}

      {message ? (
        <p className="text-seraya-status-error text-sm leading-6" role="alert">{message}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Foto utama undangan</CardTitle>
          <CardDescription>
            Empat foto ini punya peran sendiri. Galeri tidak lagi dipakai sebagai tempat menyimpan cover atau portrait secara tersembunyi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {rolePresentation.map((item) => {
              const assetId = getRoleAssetId(content, item.role);
              return (
                <article className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4" key={item.role}>
                  <div className="border-seraya-border-default bg-seraya-soft aspect-[4/3] overflow-hidden rounded-[var(--seraya-radius-md)] border">
                    {assetId ? (
                      <img alt={item.label} className="size-full object-cover" src={`/dashboard/media/${assetId}`} />
                    ) : (
                      <div className="text-seraya-text-muted flex size-full items-center justify-center px-5 text-center text-sm">Belum ada foto</div>
                    )}
                  </div>
                  <h3 className="text-seraya-text-primary mt-4 font-semibold">{item.label}</h3>
                  <p className="text-seraya-text-muted mt-1 text-sm leading-6">{item.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button loading={busyRole === item.role} onClick={() => selectUpload(item.role)} size="sm" type="button">
                      {assetId ? 'Ganti foto' : 'Upload foto'}
                    </Button>
                    {assetId ? (
                      <Button disabled={Boolean(busyRole)} onClick={() => removeRole(item.role, assetId)} size="sm" type="button" variant="secondary">
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil mempelai</CardTitle>
          <CardDescription>
            Tautan ini tampil pada profil masing-masing mempelai, bukan hanya sebagai identitas pasangan di footer.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          {[
            {
              instagram: personOneInstagram,
              label: content.couple.personOne.displayName,
              setInstagram: setPersonOneInstagram,
              setTikTok: setPersonOneTikTok,
              setWebsite: setPersonOneWebsite,
              tiktok: personOneTikTok,
              website: personOneWebsite,
            },
            {
              instagram: personTwoInstagram,
              label: content.couple.personTwo.displayName,
              setInstagram: setPersonTwoInstagram,
              setTikTok: setPersonTwoTikTok,
              setWebsite: setPersonTwoWebsite,
              tiktok: personTwoTikTok,
              website: personTwoWebsite,
            },
          ].map((profile) => (
            <fieldset className="space-y-4" key={profile.label}>
              <legend className="text-seraya-text-primary font-semibold">{profile.label}</legend>
              <label className="grid gap-2 text-sm font-semibold">
                Instagram
                <input className={inputClassName()} onChange={(event) => profile.setInstagram(event.currentTarget.value)} placeholder="https://www.instagram.com/..." type="url" value={profile.instagram} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                TikTok
                <input className={inputClassName()} onChange={(event) => profile.setTikTok(event.currentTarget.value)} placeholder="https://www.tiktok.com/@..." type="url" value={profile.tiktok} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Website
                <input className={inputClassName()} onChange={(event) => profile.setWebsite(event.currentTarget.value)} placeholder="https://..." type="url" value={profile.website} />
              </label>
            </fieldset>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wedding Film</CardTitle>
          <CardDescription>
            Tambahkan video prewedding atau wedding film dari YouTube. Video tidak autoplay dan dimuat hanya ketika section dibutuhkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input checked={filmEnabled} onChange={(event) => setFilmEnabled(event.currentTarget.checked)} type="checkbox" />
            Tampilkan Wedding Film
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Judul
            <input className={inputClassName()} onChange={(event) => setFilmHeading(event.currentTarget.value)} placeholder="Wedding Film" value={filmHeading} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Link YouTube
            <input className={inputClassName()} onChange={(event) => setFilmUrl(event.currentTarget.value)} placeholder="https://www.youtube.com/watch?v=..." type="url" value={filmUrl} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Keterangan singkat
            <textarea className={`${inputClassName()} min-h-28 py-3`} onChange={(event) => setFilmCaption(event.currentTarget.value)} value={filmCaption} />
          </label>
          <Button loading={isSavingConfiguration} onClick={saveConfiguration} type="button">Simpan profil &amp; Wedding Film</Button>
        </CardContent>
      </Card>
    </div>
  );
}
