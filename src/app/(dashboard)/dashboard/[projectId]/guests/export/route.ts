import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getGuestDirectoryCsvForCurrentUser } from '@/modules/guests/guest.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

const privateExportHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Disposition': 'attachment; filename="seraya-guest-directory.csv"',
  'Content-Type': 'text/csv; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

type GuestExportRouteProps = {
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

/** Private owner export; it never consults guest links, RSVP controls, or public caches. */
export async function GET(_request: Request, { params }: GuestExportRouteProps) {
  const { projectId } = await params;

  try {
    const csv = await getGuestDirectoryCsvForCurrentUser(projectId);
    return new Response(csv, { headers: privateExportHeaders });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof ProjectAccessDeniedError) {
      return unavailableResponse();
    }

    console.error('Seraya guest CSV export route failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return unavailableResponse();
  }
}
