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
        raise SystemExit(f"Missing anchor in {path}: {old[:180]!r}")
    write(path, content.replace(old, new, 1))


write(
    "src/modules/media/invitation-audio-playback.types.ts",
    r'''import type { InvitationAudioConfiguration } from './invitation-audio.types';

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
''',
)

write(
    "src/modules/media/invitation-audio-playback.service.ts",
    r'''import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import { getOwnedProjectById } from '@/modules/projects/project.repository';
import { getPublicInvitationBySlug } from '@/modules/publications/public-invitation.service';

import {
  createSignedInvitationAudioPlaybackUrl,
  getReadyInvitationAudioAssetForProjectIdWithAdmin,
} from './invitation-audio.repository';
import type {
  InvitationAudioConfiguration,
  InvitationAudioMediaAsset,
} from './invitation-audio.types';

export const INVITATION_AUDIO_PLAYBACK_TTL_SECONDS = 300 as const;

export class InvitationAudioPlaybackUnavailableError extends Error {
  constructor() {
    super('Invitation audio playback is unavailable.');
    this.name = 'InvitationAudioPlaybackUnavailableError';
  }
}

function assetMatchesConfiguration(
  asset: InvitationAudioMediaAsset | null,
  configuration: InvitationAudioConfiguration,
): asset is InvitationAudioMediaAsset {
  return Boolean(
    asset &&
      asset.status === 'ready' &&
      asset.deleted_at === null &&
      asset.rights_acknowledged_at &&
      asset.duration_seconds &&
      asset.original_file_name &&
      configuration.assetId === asset.id &&
      configuration.durationSeconds === asset.duration_seconds &&
      configuration.originalFileName === asset.original_file_name &&
      configuration.rightsAcknowledged === true,
  );
}

async function createPlaybackUrlForProjectConfiguration(input: {
  configuration: InvitationAudioConfiguration;
  projectId: string;
}): Promise<string | null> {
  if (!input.configuration.assetId) {
    return null;
  }

  const asset = await getReadyInvitationAudioAssetForProjectIdWithAdmin(
    input.projectId,
    input.configuration.assetId,
  );

  if (!assetMatchesConfiguration(asset, input.configuration)) {
    return null;
  }

  return createSignedInvitationAudioPlaybackUrl(asset, INVITATION_AUDIO_PLAYBACK_TTL_SECONDS);
}

/** Owner-only playback for local and persisted draft preview surfaces. */
export async function getInvitationAudioPlaybackUrlForCurrentUser(
  projectId: string,
): Promise<string | null> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  const draft = await getActiveInvitationDraftForVerifiedProject(project);

  if (!draft) {
    return null;
  }

  return createPlaybackUrlForProjectConfiguration({
    configuration: draft.content.audio,
    projectId: project.id,
  });
}

/**
 * Anonymous playback resolves only the current published snapshot by safe slug.
 * Personal invitations intentionally reuse this public-content capability: no
 * guest token, guest identity, RSVP state, or private delivery data is needed.
 */
export async function getPublishedInvitationAudioPlaybackUrl(slug: string): Promise<string | null> {
  const publishedInvitation = await getPublicInvitationBySlug(slug);
  const snapshot = publishedInvitation?.snapshot ?? null;

  if (!publishedInvitation || !publishedInvitation.is_current || !snapshot) {
    return null;
  }

  return createPlaybackUrlForProjectConfiguration({
    configuration: snapshot.draft.audio,
    projectId: publishedInvitation.project_id,
  });
}
''',
)

write(
    "src/components/invitation-audio-playback-control.module.css",
    r'''.root {
  z-index: 90;
  width: max-content;
  max-width: calc(100% - 1.5rem);
  pointer-events: auto;
}

.guest {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
}

.preview {
  position: sticky;
  top: 0.75rem;
  margin-right: 0.75rem;
  margin-bottom: -3.25rem;
  margin-left: auto;
}

.button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.55rem 0.9rem 0.55rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 12px 28px rgb(35 26 23 / 0.18);
  backdrop-filter: blur(14px);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 15px 32px rgb(35 26 23 / 0.23);
}

.button:focus-visible {
  outline: 3px solid color-mix(in srgb, currentColor 42%, transparent);
  outline-offset: 3px;
}

.button:disabled {
  cursor: progress;
  opacity: 0.78;
}

.icon {
  display: inline-flex;
  width: 1.85rem;
  height: 1.85rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-family: Georgia, serif;
  font-size: 1rem;
}

.roselle .button {
  border-color: rgb(122 65 73 / 0.24);
  background: rgb(255 250 246 / 0.94);
  color: #713d48;
}

.roselle .icon {
  background: #f5e2e1;
  color: #713d48;
}

.aruna .button {
  border-radius: 0.45rem;
  border-color: rgb(28 31 35 / 0.2);
  background: rgb(250 250 248 / 0.96);
  color: #202226;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.aruna .icon {
  border-radius: 0.25rem;
  background: #202226;
  color: #fff;
}

.laras .button {
  border-color: rgb(205 169 104 / 0.48);
  background: rgb(28 30 35 / 0.94);
  color: #ead5a7;
}

.laras .icon {
  border: 1px solid rgb(205 169 104 / 0.45);
  background: rgb(205 169 104 / 0.12);
  color: #ead5a7;
}

.error .button {
  box-shadow: 0 10px 24px rgb(116 45 45 / 0.16);
}

@media (max-width: 30rem) {
  .guest {
    right: max(0.75rem, env(safe-area-inset-right));
    bottom: max(0.75rem, env(safe-area-inset-bottom));
  }

  .button {
    min-height: 2.65rem;
    padding-right: 0.78rem;
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }

  .button:hover {
    transform: none;
  }
}
''',
)

write(
    "src/components/invitation-audio-playback-control.tsx",
    r''''use client';

import { useEffect, useRef, useState } from 'react';

import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import type { InvitationRenderSurfaceV1 } from '@/modules/invitation-templates/core/theme-renderer.types';
import type { InvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';

import styles from './invitation-audio-playback-control.module.css';

type PlaybackState = 'error' | 'idle' | 'loading' | 'muted' | 'playing';

type InvitationAudioPlaybackControlProps = {
  capability: InvitationAudioPlaybackCapability;
  surface: InvitationRenderSurfaceV1;
  templateKey: InvitationTemplateKey;
};

function createPlaybackRequestUrl(requestUrl: string) {
  const separator = requestUrl.includes('?') ? '&' : '?';
  return `${requestUrl}${separator}playback=${Date.now()}`;
}

function getPlaybackCopy(state: PlaybackState) {
  switch (state) {
    case 'loading':
      return {
        ariaLabel: 'Menyiapkan musik undangan',
        liveMessage: 'Musik undangan sedang disiapkan.',
        visibleLabel: 'Menyiapkan…',
      };
    case 'playing':
      return {
        ariaLabel: 'Matikan suara musik undangan',
        liveMessage: 'Musik undangan sedang diputar dengan suara aktif.',
        visibleLabel: 'Suara aktif',
      };
    case 'muted':
      return {
        ariaLabel: 'Nyalakan suara musik undangan',
        liveMessage: 'Musik undangan tetap diputar tanpa suara.',
        visibleLabel: 'Suara mati',
      };
    case 'error':
      return {
        ariaLabel: 'Coba putar kembali musik undangan',
        liveMessage: 'Musik belum dapat diputar. Tombol dapat digunakan untuk mencoba lagi.',
        visibleLabel: 'Coba lagi',
      };
    default:
      return {
        ariaLabel: 'Putar musik undangan',
        liveMessage: 'Musik undangan tersedia dan tidak diputar otomatis.',
        visibleLabel: 'Putar musik',
      };
  }
}

export function InvitationAudioPlaybackControl({
  capability,
  surface,
  templateKey,
}: InvitationAudioPlaybackControlProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlaybackState>('idle');
  const copy = getPlaybackCopy(state);
  const isLoaded = state === 'playing' || state === 'muted';

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  async function handlePlaybackClick() {
    const audio = audioRef.current;
    if (!audio || state === 'loading') {
      return;
    }

    if (state === 'playing') {
      audio.muted = true;
      setState('muted');
      return;
    }

    if (state === 'muted') {
      audio.muted = false;
      setState('playing');
      return;
    }

    audio.pause();
    audio.muted = false;
    audio.src = createPlaybackRequestUrl(capability.requestUrl);
    audio.load();
    setState('loading');

    try {
      await audio.play();
      setState('playing');
    } catch {
      audio.removeAttribute('src');
      audio.load();
      setState('error');
    }
  }

  return (
    <div
      className={[
        styles.root,
        surface === 'preview' ? styles.preview : styles.guest,
        styles[templateKey],
        state === 'error' ? styles.error : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-audio-playback-state={state}
      data-invitation-audio-playback="v4j-slice-c"
      data-playback-surface={surface}
    >
      <audio
        ref={audioRef}
        loop
        onError={() => setState('error')}
        onPlaying={() => setState((current) => (current === 'muted' ? 'muted' : 'playing'))}
        playsInline
        preload="none"
      />
      <button
        aria-label={copy.ariaLabel}
        aria-pressed={isLoaded ? state === 'muted' : undefined}
        className={styles.button}
        disabled={state === 'loading'}
        onClick={handlePlaybackClick}
        type="button"
      >
        <span aria-hidden="true" className={styles.icon}>
          {state === 'muted' ? '×' : state === 'error' ? '↻' : '♪'}
        </span>
        <span>{copy.visibleLabel}</span>
      </button>
      <span aria-live="polite" className="sr-only" role="status">
        {copy.liveMessage}
      </span>
    </div>
  );
}
''',
)

public_route = r'''import { NextResponse } from 'next/server';

import { getPublishedInvitationAudioPlaybackUrl } from '@/modules/media/invitation-audio-playback.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privatePlaybackHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

type PublicAudioPlaybackRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: PublicAudioPlaybackRouteProps) {
  const { slug } = await params;

  try {
    const signedUrl = await getPublishedInvitationAudioPlaybackUrl(slug);

    if (!signedUrl) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
    }

    return NextResponse.redirect(signedUrl, {
      headers: privatePlaybackHeaders,
      status: 307,
    });
  } catch (error) {
    console.error('Seraya published invitation audio playback failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
  }
}
'''
write("src/app/api/invitations/[slug]/audio/playback/route.ts", public_route)

write(
    "src/app/api/projects/[projectId]/audio/playback/route.ts",
    r'''import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getInvitationAudioPlaybackUrlForCurrentUser } from '@/modules/media/invitation-audio-playback.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privatePlaybackHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

type OwnerAudioPlaybackRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, { params }: OwnerAudioPlaybackRouteProps) {
  const { projectId } = await params;

  try {
    const signedUrl = await getInvitationAudioPlaybackUrlForCurrentUser(projectId);

    if (!signedUrl) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
    }

    return NextResponse.redirect(signedUrl, {
      headers: privatePlaybackHeaders,
      status: 307,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 401 });
    }

    if (error instanceof ProjectAccessDeniedError) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
    }

    console.error('Seraya owner preview audio playback failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
  }
}
''',
)

# Repository: ready project-scoped lookup and short-lived signed playback URL.
replace_once(
    "src/modules/media/invitation-audio.repository.ts",
    "export async function createSignedInvitationAudioUploadUrl(\n  asset: InvitationAudioMediaAsset,\n): Promise<string> {",
    """export async function getReadyInvitationAudioAssetForProjectIdWithAdmin(
  projectId: string,
  assetId: string,
): Promise<InvitationAudioMediaAsset | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(invitationAudioSelect)
    .eq('id', assetId)
    .eq('project_id', projectId)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new InvitationAudioRepositoryError();
  }

  return data ? mapInvitationAudioAsset(data) : null;
}

export async function createSignedInvitationAudioPlaybackUrl(
  asset: InvitationAudioMediaAsset,
  expiresInSeconds: number,
): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new InvitationAudioRepositoryError();
  }

  return data.signedUrl;
}

export async function createSignedInvitationAudioUploadUrl(
  asset: InvitationAudioMediaAsset,
): Promise<string> {""",
)

# Canonical renderer mounts exactly one shared player before the template.
replace_once(
    "src/modules/invitation-templates/invitation-template-renderer.tsx",
    "import { createElement } from 'react';\n",
    """import { createElement, Fragment } from 'react';

import { InvitationAudioPlaybackControl } from '@/components/invitation-audio-playback-control';
import type { InvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
""",
)
replace_once(
    "src/modules/invitation-templates/invitation-template-renderer.tsx",
    "type InvitationTemplateRendererProps = {\n  invitation: InvitationViewModel;",
    "type InvitationTemplateRendererProps = {\n  audioPlayback?: InvitationAudioPlaybackCapability;\n  invitation: InvitationViewModel;",
)
replace_once(
    "src/modules/invitation-templates/invitation-template-renderer.tsx",
    "export function InvitationTemplateRenderer({\n  invitation,",
    "export function InvitationTemplateRenderer({\n  audioPlayback,\n  invitation,",
)
replace_once(
    "src/modules/invitation-templates/invitation-template-renderer.tsx",
    "  return createElement(invitationTemplateRegistry[templateKey], {\n    invitation,\n    renderContext,\n  });",
    """  return createElement(
    Fragment,
    null,
    audioPlayback
      ? createElement(InvitationAudioPlaybackControl, {
          capability: audioPlayback,
          surface,
          templateKey,
        })
      : null,
    createElement(invitationTemplateRegistry[templateKey], {
      invitation,
      renderContext,
    }),
  );""",
)

# Generic and personal routes expose only an internal playback capability.
replace_once(
    "src/app/[slug]/page.tsx",
    "import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';",
    """import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';""",
)
replace_once(
    "src/app/[slug]/page.tsx",
    "      <InvitationTemplateRenderer\n        invitation={invitation}",
    """      <InvitationTemplateRenderer
        audioPlayback={createInvitationAudioPlaybackCapability({
          configuration: snapshot.draft.audio,
          requestUrl: `/api/invitations/${encodeURIComponent(slug)}/audio/playback`,
        })}
        invitation={invitation}""",
)

replace_once(
    "src/app/[slug]/g/[guestToken]/page.tsx",
    "import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';",
    """import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';""",
)
replace_once(
    "src/app/[slug]/g/[guestToken]/page.tsx",
    "      <InvitationTemplateRenderer\n        invitation={invitation}",
    """      <InvitationTemplateRenderer
        audioPlayback={createInvitationAudioPlaybackCapability({
          configuration: snapshot.draft.audio,
          requestUrl: `/api/invitations/${encodeURIComponent(slug)}/audio/playback`,
        })}
        invitation={invitation}""",
)

# Saved preview uses authenticated owner playback.
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/preview/page.tsx",
    "import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';",
    """import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';""",
)
replace_once(
    "src/app/(dashboard)/dashboard/[projectId]/preview/page.tsx",
    "        <InvitationTemplateRenderer\n          invitation={invitation}",
    """        <InvitationTemplateRenderer
          audioPlayback={createInvitationAudioPlaybackCapability({
            configuration: privateDraft.draft.content.audio,
            requestUrl: `/api/projects/${encodeURIComponent(projectId)}/audio/playback`,
          })}
          invitation={invitation}""",
)

# Local preview receives a separately persisted audio capability and owner route.
replace_once(
    "src/components/projects/invitation-editor-live-preview.tsx",
    "import type { InvitationGalleryImage } from '@/modules/media/media.types';",
    """import {
  createInvitationAudioPlaybackCapability,
  type InvitationAudioChangedEventDetail,
} from '@/modules/media/invitation-audio-playback.types';
import type { InvitationAudioConfiguration } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';""",
)
replace_once(
    "src/components/projects/invitation-editor-live-preview.tsx",
    "export type InvitationEditorLivePreviewProps = {\n  content: InvitationDraftContent;",
    """export type InvitationEditorLivePreviewProps = {
  audio: InvitationAudioConfiguration;
  content: InvitationDraftContent;""",
)
replace_once(
    "src/components/projects/invitation-editor-live-preview.tsx",
    "  project: InvitationRendererProjectMetadata;\n};",
    "  project: InvitationRendererProjectMetadata;\n  projectId: string;\n};",
)
replace_once(
    "src/components/projects/invitation-editor-live-preview.tsx",
    "export const InvitationEditorLivePreview = memo(function InvitationEditorLivePreview({\n  content,",
    "export const InvitationEditorLivePreview = memo(function InvitationEditorLivePreview({\n  audio,\n  content,",
)
replace_once(
    "src/components/projects/invitation-editor-live-preview.tsx",
    "  project,\n}: InvitationEditorLivePreviewProps) {",
    "  project,\n  projectId,\n}: InvitationEditorLivePreviewProps) {",
)
replace_once(
    "src/components/projects/invitation-editor-live-preview.tsx",
    "            <InvitationTemplateRenderer\n              invitation={invitation}",
    """            <InvitationTemplateRenderer
              audioPlayback={createInvitationAudioPlaybackCapability({
                configuration: audio,
                requestUrl: `/api/projects/${encodeURIComponent(projectId)}/audio/playback`,
              })}
              invitation={invitation}""",
)

# Editor tracks atomic audio manager changes independently from local form dirtiness.
replace_once(
    "src/components/projects/invitation-editor.tsx",
    "import type { InvitationGalleryImage } from '@/modules/media/media.types';",
    """import {
  INVITATION_AUDIO_CHANGED_EVENT,
  type InvitationAudioChangedEventDetail,
} from '@/modules/media/invitation-audio-playback.types';
import type { InvitationAudioConfiguration } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';""",
)
# Insert state after known preview state line.
replace_once(
    "src/components/projects/invitation-editor.tsx",
    "  const [previewContent, setPreviewContent] = useState(content);",
    """  const [previewAudio, setPreviewAudio] = useState<InvitationAudioConfiguration>(
    draft.content.audio,
  );
  const [previewContent, setPreviewContent] = useState(content);""",
)
# Add event synchronization before draft sync effect.
replace_once(
    "src/components/projects/invitation-editor.tsx",
    "  useEffect(() => {\n    if (draft.updated_at === lastSyncedDraftUpdatedAt.current || isDirty) {",
    """  useEffect(() => {
    setPreviewAudio(draft.content.audio);
  }, [draft.content.audio]);

  useEffect(() => {
    const handleAudioChanged = (event: Event) => {
      const detail = (event as CustomEvent<InvitationAudioChangedEventDetail>).detail;

      setPreviewAudio(
        detail.enabled && detail.durationSeconds
          ? {
              assetId: 'persisted-owner-audio',
              durationSeconds: detail.durationSeconds,
              originalFileName: 'Audio undangan',
              rightsAcknowledged: true,
            }
          : {
              assetId: null,
              durationSeconds: null,
              originalFileName: null,
              rightsAcknowledged: false,
            },
      );
    };

    window.addEventListener(INVITATION_AUDIO_CHANGED_EVENT, handleAudioChanged);
    return () => window.removeEventListener(INVITATION_AUDIO_CHANGED_EVENT, handleAudioChanged);
  }, []);

  useEffect(() => {
    if (draft.updated_at === lastSyncedDraftUpdatedAt.current || isDirty) {""",
)
replace_once(
    "src/components/projects/invitation-editor.tsx",
    "              <DeferredInvitationEditorLivePreview\n                content={previewContent}",
    """              <DeferredInvitationEditorLivePreview
                audio={previewAudio}
                content={previewContent}""",
)
replace_once(
    "src/components/projects/invitation-editor.tsx",
    "                project={project}\n              />",
    "                project={project}\n                projectId={projectId}\n              />",
)

# Audio manager notifies local preview after atomic upload/remove and updates copy.
replace_once(
    "src/components/projects/invitation-audio-manager.tsx",
    "import {\n  MAX_INVITATION_AUDIO_BYTES,",
    """import {
  INVITATION_AUDIO_CHANGED_EVENT,
  type InvitationAudioChangedEventDetail,
} from '@/modules/media/invitation-audio-playback.types';
import {
  MAX_INVITATION_AUDIO_BYTES,""",
)
replace_once(
    "src/components/projects/invitation-audio-manager.tsx",
    "async function readJson<T>(response: Response): Promise<T> {",
    """function announceAudioChange(detail: InvitationAudioChangedEventDetail) {
  window.dispatchEvent(
    new CustomEvent<InvitationAudioChangedEventDetail>(INVITATION_AUDIO_CHANGED_EVENT, { detail }),
  );
}

async function readJson<T>(response: Response): Promise<T> {""",
)
replace_once(
    "src/components/projects/invitation-audio-manager.tsx",
    "      setAudio(finalized.audio);\n      toast({",
    """      setAudio(finalized.audio);
      announceAudioChange({
        durationSeconds: finalized.audio.durationSeconds,
        enabled: true,
      });
      toast({""",
)
replace_once(
    "src/components/projects/invitation-audio-manager.tsx",
    "      setAudio(null);\n      toast({ title: 'Audio dihapus dari draf undangan.', variant: 'success' });",
    """      setAudio(null);
      announceAudioChange({ durationSeconds: null, enabled: false });
      toast({ title: 'Audio dihapus dari draf undangan.', variant: 'success' });""",
)
replace_once(
    "src/components/projects/invitation-audio-manager.tsx",
    "          Siapkan satu audio MP3 atau M4A untuk suasana undangan. Audio tidak diputar otomatis;\n          kontrol tamu akan ditambahkan pada tahap berikutnya.",
    """          Siapkan satu audio MP3 atau M4A untuk suasana undangan. Audio tidak diputar otomatis;
          tamu memulainya sendiri melalui kontrol musik yang selalu tersedia.""",
)
replace_once(
    "src/components/projects/invitation-audio-manager.tsx",
    "      data-v4j-audio-foundation=\"slice-b\"",
    "      data-v4j-audio-foundation=\"slice-c\"",
)

write(
    "tests/unit/invitation-audio-playback-v4j.test.ts",
    r'''import { readFileSync } from 'node:fs';

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
    const control = readFileSync(
      'src/components/invitation-audio-playback-control.tsx',
      'utf8',
    );

    expect(control).toContain('preload="none"');
    expect(control).not.toContain('autoPlay');
    expect(control).toContain('audio.src = createPlaybackRequestUrl(capability.requestUrl)');
    expect(control).toContain('await audio.play()');
    expect(control).toContain("state === 'playing'");
    expect(control).toContain('audio.muted = true');
  });

  it('uses short-lived no-store redirects instead of exposing storage paths', () => {
    const service = readFileSync(
      'src/modules/media/invitation-audio-playback.service.ts',
      'utf8',
    );
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
''',
)
