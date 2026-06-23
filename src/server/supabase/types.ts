import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * SRY-003 intentionally avoids handwritten table definitions.
 * Run `npm run db:types` after a local reset (or with a supplied project ref)
 * to create `database.types.ts` from the active schema.
 *
 * TODO(SRY-003): once generated, import `Database` from `./database.types` and
 * parameterize this shared client alias as `SupabaseClient<Database>`. Browser,
 * server, and admin helpers all inherit the alias, so no handwritten schema
 * substitute is needed before type generation can run.
 */
export type SerayaSupabaseClient = SupabaseClient;

export type SerayaAuthUser = Pick<User, 'id' | 'email' | 'user_metadata'>;
