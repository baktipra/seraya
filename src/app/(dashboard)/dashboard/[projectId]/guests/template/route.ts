import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getGuestImportXlsxTemplateForCurrentUser } from '@/modules/guests/guest.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

const privateTemplateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Disposition': 'attachment; filename="seraya-template-daftar-tamu.xlsx"',
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'X-Content-Type-Options': 'nosniff',
};

type GuestTemplateRouteProps = {
  params: Promise<{ projectId: string }>;
};

function unavailableResponse() {
  return new Response(null, {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
    status: 404,
  });
}

/** Private owner template download; it exposes no guest data, tokens, or published snapshot content. */
export async function GET(_request: Request, { params }: GuestTemplateRouteProps) {
  const { projectId } = await params;

  try {
    const workbook = await getGuestImportXlsxTemplateForCurrentUser(projectId);
    const body = new Uint8Array(workbook.byteLength);
    body.set(workbook);
    return new Response(body.buffer, { headers: privateTemplateHeaders });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof ProjectAccessDeniedError) {
      return unavailableResponse();
    }

    console.error('Seraya guest XLSX template route failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return unavailableResponse();
  }
}
