import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

const repository = 'baktipra/seraya';
const expectedBranch = 'agent/p0-a2-a3-navigation-data-boundary-recovery';
const expectedWorkflow = 'P0-A2-A3 authenticated transition matrix';
const shaPattern = /^[0-9a-f]{40}$/i;
const runIdPattern = /^\d{1,20}$/;

function jsonError(status: number, code: string) {
  return NextResponse.json(
    { code },
    {
      headers: { 'Cache-Control': 'private, no-store' },
      status,
    },
  );
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
}

function getGitHubHeaders(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'seraya-p0-a2-a3-performance-audit',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function isDeploymentAncestorOfRunHead({
  githubToken,
  runHeadSha,
  targetSha,
}: {
  githubToken: string;
  runHeadSha: string;
  targetSha: string;
}) {
  if (runHeadSha === targetSha) return true;

  const compareResponse = await fetch(
    `https://api.github.com/repos/${repository}/compare/${targetSha}...${runHeadSha}`,
    {
      cache: 'no-store',
      headers: getGitHubHeaders(githubToken),
    },
  );

  if (!compareResponse.ok) return false;

  const comparison = (await compareResponse.json()) as {
    merge_base_commit?: { sha?: unknown };
    status?: unknown;
  };

  return comparison.status === 'ahead' && comparison.merge_base_commit?.sha === targetSha;
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') {
    return jsonError(404, 'not_found');
  }

  const githubToken = getBearerToken(request);
  const githubRunId = request.headers.get('x-github-run-id')?.trim() ?? '';
  const targetSha = request.headers.get('x-github-sha')?.trim() ?? '';

  if (!githubToken || !runIdPattern.test(githubRunId) || !shaPattern.test(targetSha)) {
    return jsonError(401, 'invalid_credentials');
  }

  if (process.env.VERCEL_GIT_COMMIT_SHA !== targetSha) {
    return jsonError(409, 'preview_not_current');
  }

  const runResponse = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${githubRunId}`,
    {
      cache: 'no-store',
      headers: getGitHubHeaders(githubToken),
    },
  );

  if (!runResponse.ok) {
    return jsonError(401, 'github_run_unverified');
  }

  const run = (await runResponse.json()) as {
    event?: unknown;
    head_branch?: unknown;
    head_sha?: unknown;
    name?: unknown;
    repository?: { full_name?: unknown };
  };

  if (
    run.event !== 'pull_request' ||
    run.head_branch !== expectedBranch ||
    typeof run.head_sha !== 'string' ||
    !shaPattern.test(run.head_sha) ||
    run.name !== expectedWorkflow ||
    run.repository?.full_name !== repository
  ) {
    return jsonError(403, 'github_run_scope_rejected');
  }

  const targetIsAncestor = await isDeploymentAncestorOfRunHead({
    githubToken,
    runHeadSha: run.head_sha,
    targetSha,
  });

  if (!targetIsAncestor) {
    return jsonError(403, 'github_run_lineage_rejected');
  }

  const admin = createAdminSupabaseClient();
  const { data: project, error: projectError } = await admin
    .from('wedding_projects')
    .select('account_id')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ account_id: string }>();

  if (projectError || !project?.account_id) {
    return jsonError(503, 'measurement_project_unavailable');
  }

  const { data: userResult, error: userError } = await admin.auth.admin.getUserById(
    project.account_id,
  );
  const email = userResult.user?.email;

  if (userError || !email) {
    return jsonError(503, 'measurement_owner_unavailable');
  }

  const { data: linkResult, error: linkError } = await admin.auth.admin.generateLink({
    email,
    type: 'magiclink',
  });
  const tokenHash = linkResult.properties?.hashed_token;

  if (linkError || !tokenHash) {
    return jsonError(503, 'measurement_link_unavailable');
  }

  const sessionSupabase = await createServerSupabaseClient();
  const { error: verifyError } = await sessionSupabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });

  if (verifyError) {
    return jsonError(503, 'measurement_session_unavailable');
  }

  return NextResponse.json(
    { dashboardPath: '/dashboard' },
    {
      headers: { 'Cache-Control': 'private, no-store' },
      status: 200,
    },
  );
}
