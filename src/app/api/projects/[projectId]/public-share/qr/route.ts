import QRCode from 'qrcode';

import { AuthenticationRequiredError, requireCurrentUser } from '@/modules/auth/current-user';
import { getOwnedProjectById } from '@/modules/projects/project.repository';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getPublicSocialShareForVerifiedProject } from '@/modules/public-social-share/public-social-share.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

function unavailable(status: number) {
  return Response.json({ message: 'QR undangan publik belum tersedia.' }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await requireCurrentUser();
    const project = await getOwnedProjectById(projectId, user.id);
    const model = await getPublicSocialShareForVerifiedProject(project);
    if (!model) return unavailable(404);

    const png = await QRCode.toBuffer(model.publicUrl, {
      color: { dark: '#171717', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
      margin: 4,
      type: 'png',
      width: 1024,
    });

    return new Response(new Uint8Array(png), {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': `attachment; filename="seraya-${project.slug}-qr.png"`,
        'Content-Type': 'image/png',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return unavailable(401);
    if (error instanceof ProjectAccessDeniedError) return unavailable(404);
    throw error;
  }
}
