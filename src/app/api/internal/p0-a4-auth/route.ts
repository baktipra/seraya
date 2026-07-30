import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const repository = 'baktipra/seraya';
const branch = 'agent/p0-a4-readiness-aggregation-recovery';
const pullRequestNumber = 40;

function noStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function reject(status: number, stage: string) {
  return noStore(
    NextResponse.json({ error: 'Benchmark authorization failed.', stage }, { status }),
  );
}

async function authorizeBenchmarkRequest(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') return null;

  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const measuredSha = request.headers.get('x-seraya-measured-sha');
  const runId = request.headers.get('x-github-run-id');
  const authorization = request.headers.get('authorization');

  if (
    !deploymentSha ||
    measuredSha !== deploymentSha ||
    !runId ||
    !authorization?.startsWith('Bearer ')
  ) {
    return null;
  }

  const githubResponse = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${encodeURIComponent(runId)}`,
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: authorization,
        'User-Agent': 'seraya-p0-a4-benchmark',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!githubResponse.ok) return null;

  const run = (await githubResponse.json()) as {
    event?: string;
    head_branch?: string;
    pull_requests?: Array<{ number?: number }>;
    repository?: { full_name?: string };
  };

  if (
    run.repository?.full_name !== repository ||
    run.event !== 'pull_request' ||
    run.head_branch !== branch ||
    !run.pull_requests?.some((pullRequest) => pullRequest.number === pullRequestNumber)
  ) {
    return null;
  }

  return runId;
}

export async function POST(request: NextRequest) {
  const runId = await authorizeBenchmarkRequest(request);
  if (!runId) return reject(403, 'request_authority');

  const admin = createAdminSupabaseClient();
  const email = `p0-a4-${runId}@seraya.test`;
  const slug = `p0-a4-${runId}`.slice(0, 80);

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    email,
    options: {
      data: { display_name: 'P0 A4 Benchmark' },
    },
    type: 'magiclink',
  });

  const tokenHash = linkData?.properties?.hashed_token;
  const userId = linkData?.user?.id;
  if (linkError || !tokenHash || !userId) return reject(500, 'magic_link');

  const { data: existingProject, error: existingProjectError } = await admin
    .from('wedding_projects')
    .select('id')
    .eq('account_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingProjectError) return reject(500, 'project_lookup');

  let projectId = existingProject?.id ?? null;
  if (!projectId) {
    const { data: project, error: projectError } = await admin
      .from('wedding_projects')
      .insert({
        account_id: userId,
        event_city: 'Jakarta',
        event_date_primary: '2026-12-12',
        person_one_name: 'Alya',
        person_two_name: 'Raka',
        slug,
      })
      .select('id')
      .single();

    if (projectError || !project) return reject(500, 'project_create');
    projectId = project.id;
  }

  const { data: verified, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (verifyError || !verified.session) return reject(500, 'magic_link_verify');

  const server = await createServerSupabaseClient();
  const { error: sessionError } = await server.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });

  if (sessionError) return reject(500, 'session_cookie');

  return noStore(NextResponse.json({ projectId, userId }));
}

export async function DELETE(request: NextRequest) {
  const runId = await authorizeBenchmarkRequest(request);
  if (!runId) return reject(403, 'request_authority');

  const input = (await request.json().catch(() => null)) as
    | { projectId?: string; userId?: string }
    | null;
  if (!input?.projectId || !input.userId) return reject(400, 'cleanup_input');

  const admin = createAdminSupabaseClient();
  const { error: projectError } = await admin
    .from('wedding_projects')
    .delete()
    .eq('id', input.projectId)
    .eq('account_id', input.userId);

  if (projectError) return reject(500, 'cleanup_project');

  const { error: userError } = await admin.auth.admin.deleteUser(input.userId);
  if (userError) return reject(500, 'cleanup_user');

  return noStore(NextResponse.json({ cleaned: true }));
}
