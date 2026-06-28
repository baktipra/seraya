import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getGuestOperationsXlsxForCurrentUser } from '@/modules/guests/guest.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

const privateExportHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Disposition': 'attachment; filename="seraya-daftar-tamu.xlsx"',
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'X-Content-Type-Options': 'nosniff',
};

type ExportRouteProps = { params: Promise<{ projectId: string }> };

function unavailableResponse() {
  return new Response(null, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
    status: 404,
  });
}

async function parseGuestIds(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const guestIds = (body as { guestIds?: unknown }).guestIds;
    if (
      !Array.isArray(guestIds) ||
      guestIds.length > 1_000 ||
      new Set(guestIds).size !== guestIds.length ||
      !guestIds.every((id) => typeof id === 'string')
    )
      return null;
    return guestIds;
  } catch {
    return null;
  }
}

/** Private owner export. IDs are only a selection request and are intersected with server-verified project rows. */
export async function POST(request: Request, { params }: ExportRouteProps) {
  const { projectId } = await params;
  const guestIds = await parseGuestIds(request);
  if (!guestIds) return unavailableResponse();
  try {
    const bytes = await getGuestOperationsXlsxForCurrentUser({ guestIds, projectId });
    const body = Uint8Array.from(bytes).buffer;
    return new Response(body, { headers: privateExportHeaders });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof ProjectAccessDeniedError)
      return unavailableResponse();
    console.error('Seraya guest XLSX export route failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return unavailableResponse();
  }
}
