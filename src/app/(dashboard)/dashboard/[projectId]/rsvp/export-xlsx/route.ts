import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getRsvpResponseXlsxForCurrentUser } from '@/modules/guests/rsvp-analytics.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

const privateExportHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Disposition': 'attachment; filename="seraya-respons-tamu.xlsx"',
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

/** Private owner RSVP export. No URL, token, ciphertext, or contact number leaves this route. */
export async function GET(_request: Request, { params }: ExportRouteProps) {
  const { projectId } = await params;
  try {
    const bytes = await getRsvpResponseXlsxForCurrentUser(projectId);
    return new Response(Uint8Array.from(bytes).buffer, { headers: privateExportHeaders });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof ProjectAccessDeniedError) {
      return unavailableResponse();
    }
    console.error('Seraya RSVP XLSX export route failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return unavailableResponse();
  }
}
