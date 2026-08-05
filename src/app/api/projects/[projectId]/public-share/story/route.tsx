import { ImageResponse } from 'next/og';
import QRCode from 'qrcode';

import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from '@/modules/auth/current-user';
import { getOwnedProjectById } from '@/modules/projects/project.repository';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import {
  createPublicShareFingerprint,
  getPublicShareCtaLabel,
  publicShareRenderOptionsSchema,
} from '@/modules/public-social-share/public-social-share.core';
import { getPublicSocialShareForVerifiedProject } from '@/modules/public-social-share/public-social-share.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

const TEMPLATE_STYLE = {
  aruna: {
    accent: '#224A67',
    background: '#F3F0E8',
    foreground: '#18202A',
    muted: '#53606B',
  },
  laras: {
    accent: '#C4A777',
    background: '#14171D',
    foreground: '#F6F0E5',
    muted: '#C9C1B5',
  },
  roselle: {
    accent: '#A85C6D',
    background: '#F7EEE9',
    foreground: '#4B2F35',
    muted: '#795D64',
  },
} as const;

function unavailable(status: number) {
  return Response.json({ message: 'Story undangan publik belum tersedia.' }, { status });
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value !== '0' && value !== 'false';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await requireCurrentUser();
    const project = await getOwnedProjectById(projectId, user.id);
    const model = await getPublicSocialShareForVerifiedProject(project);
    if (!model) return unavailable(404);

    const search = new URL(request.url).searchParams;
    const options = publicShareRenderOptionsSchema.parse({
      cta: search.get('cta') ?? 'open_invitation',
      showQr: parseBoolean(search.get('showQr'), true),
      showSerayaBrand: parseBoolean(search.get('showSerayaBrand'), true),
      showVenue: parseBoolean(search.get('showVenue'), false),
    });
    const theme = TEMPLATE_STYLE[model.templateKey];
    const qrDataUrl = options.showQr
      ? await QRCode.toDataURL(model.publicUrl, {
          color: { dark: theme.foreground, light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
          margin: 3,
          width: 320,
        })
      : null;
    const fingerprint = createPublicShareFingerprint(model, options);

    return new ImageResponse(
      <div
        style={{
          alignItems: 'stretch',
          background: theme.background,
          color: theme.foreground,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '250px 90px 320px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            border: `2px solid ${theme.accent}`,
            bottom: 64,
            display: 'flex',
            left: 64,
            opacity: 0.45,
            position: 'absolute',
            right: 64,
            top: 64,
          }}
        />
        {model.templateKey === 'roselle' ? (
          <div
            style={{
              background: theme.accent,
              borderRadius: 999,
              display: 'flex',
              height: 210,
              opacity: 0.12,
              position: 'absolute',
              right: -30,
              top: 180,
              width: 210,
            }}
          />
        ) : null}
        {model.templateKey === 'aruna' ? (
          <div
            style={{
              background: theme.accent,
              display: 'flex',
              height: 18,
              left: 90,
              position: 'absolute',
              top: 210,
              width: 360,
            }}
          />
        ) : null}
        {model.templateKey === 'laras' ? (
          <div
            style={{
              border: `1px solid ${theme.accent}`,
              display: 'flex',
              height: 160,
              left: 460,
              position: 'absolute',
              top: 150,
              transform: 'rotate(45deg)',
              width: 160,
            }}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
          <div
            style={{
              color: theme.accent,
              display: 'flex',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 8,
              textTransform: 'uppercase',
            }}
          >
            The Wedding Of
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: model.templateKey === 'aruna' ? 'sans-serif' : 'serif',
              fontSize: model.templateKey === 'aruna' ? 112 : 130,
              fontWeight: model.templateKey === 'aruna' ? 800 : 500,
              letterSpacing: model.templateKey === 'aruna' ? -6 : -2,
              lineHeight: 0.95,
              maxWidth: 860,
            }}
          >
            {model.coupleLabel}
          </div>
          <div
            style={{
              color: theme.muted,
              display: 'flex',
              fontSize: 38,
              lineHeight: 1.35,
            }}
          >
            {model.eventDate}
          </div>
          {options.showVenue && (model.venueName || model.venueAddress) ? (
            <div
              style={{
                color: theme.muted,
                display: 'flex',
                flexDirection: 'column',
                fontSize: 29,
                gap: 10,
                lineHeight: 1.35,
                maxWidth: 720,
              }}
            >
              {model.venueName ? <div style={{ display: 'flex' }}>{model.venueName}</div> : null}
              {model.venueAddress ? (
                <div style={{ display: 'flex' }}>{model.venueAddress}</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          style={{
            alignItems: 'flex-end',
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 500 }}>
            <div
              style={{
                color: theme.accent,
                display: 'flex',
                fontSize: 31,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {getPublicShareCtaLabel(options.cta)}
            </div>
            <div
              style={{
                color: theme.muted,
                display: 'flex',
                fontSize: 25,
                lineHeight: 1.4,
              }}
            >
              Pindai QR atau buka tautan undangan publik kami.
            </div>
            {options.showSerayaBrand ? (
              <div style={{ color: theme.muted, display: 'flex', fontSize: 22, marginTop: 24 }}>
                Dibuat dengan Seraya
              </div>
            ) : null}
          </div>
          {qrDataUrl ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 28,
                display: 'flex',
                padding: 22,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="QR undangan publik" height="270" src={qrDataUrl} width="270" />
            </div>
          ) : null}
        </div>
      </div>,
      {
        height: STORY_HEIGHT,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'Content-Disposition': `inline; filename="seraya-${project.slug}-instagram-story.png"`,
          'X-Content-Type-Options': 'nosniff',
          'X-Seraya-Share-Fingerprint': fingerprint,
        },
        width: STORY_WIDTH,
      },
    );
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return unavailable(401);
    if (error instanceof ProjectAccessDeniedError) return unavailable(404);
    throw error;
  }
}
