import 'server-only';

import { createServerSupabaseClient } from '@/server/supabase/server';
import type { SerayaAuthUser } from '@/server/supabase/types';

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication is required for this action.');
    this.name = 'AuthenticationRequiredError';
  }
}

export async function getCurrentUser(): Promise<SerayaAuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
  };
}

export async function requireCurrentUser(): Promise<SerayaAuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationRequiredError();
  }

  return user;
}
