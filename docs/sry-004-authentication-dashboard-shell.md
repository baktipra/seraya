# SRY-004 — Authentication & Dashboard Shell

## Scope delivered

- `/login` with email magic-link and Google OAuth entry points through Supabase Auth.
- `/auth/callback` with safe code exchange and safe, internal dashboard-only return paths.
- `/auth/signout` that invokes server-side Supabase `signOut` and returns to login.
- Protected `/dashboard` route family via Next.js 16 `src/proxy.ts`, with SSR cookie refresh and a server-layout defense-in-depth check.
- Responsive private dashboard shell: desktop top bar/sidebar and mobile top bar/bottom navigation.
- Empty dashboard state for an account with no active wedding project, plus non-functional feature placeholders.
- Trigger-backed profile presence check; an unavailable profile shows a recoverable, human-safe notice and logs a server-side event without browser-side profile creation.

## Auth flow

1. On `/login`, the browser-safe Supabase client requests a magic link through `signInWithOtp` or starts Google OAuth through `signInWithOAuth`.
2. Both flows send users only to `/auth/callback?next=<safe-dashboard-path>`.
3. `/auth/callback` exchanges the PKCE code using the request/session-aware server client.
4. A successful exchange redirects to `/dashboard` or a validated internal dashboard child path. A failed or malformed callback returns to `/login` with generic, human-readable recovery copy.
5. `/auth/signout` calls `auth.signOut()` server-side and redirects to `/login?notice=signed_out`.

## Redirect safety

`src/modules/auth/redirects.ts` accepts only relative `/dashboard` paths. External URLs, protocol-relative URLs, and non-dashboard return paths fall back to `/dashboard`. This applies to proxy redirects, callback returns, and client-created callback URLs.

## Local configuration

The local Supabase config allows exact callback URLs:

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

For a hosted Supabase project, add each exact deployed callback URL in **Auth → URL Configuration → Redirect URLs**, and configure the Google provider in the Supabase project. Do not add a wildcard production callback unless the deployment platform requires it and the security review approves it.

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Route protection

Next.js 16 uses `proxy.ts` in place of the older `middleware.ts` convention. `src/proxy.ts` applies only to `/dashboard/:path*` and `/login`.

- A clearly anonymous `/dashboard` request redirects immediately to `/login?next=...`.
- A request carrying a Supabase session cookie creates an SSR client, calls `auth.getUser()`, lets `@supabase/ssr` persist refreshed cookies, then allows or denies the route.
- The dashboard server layout calls `requireCurrentUser()` again so the private app does not rely on proxy logic alone.
- Every project-scoped dashboard route also calls the existing SRY-003 ownership helper before rendering a placeholder.

## Verification

`npm test` covers:

- safe redirect and callback URL handling;
- email validation and magic-link success/error state logic;
- proxy-level unauthenticated redirect and authenticated access behavior;
- callback exchange outcomes and server sign-out redirect;
- login, empty state, desktop navigation, and mobile navigation rendering;
- existing SRY-003 PostgreSQL-compatible migration/RLS checks.

`tests/e2e/dashboard-auth.spec.ts` covers the anonymous dashboard redirect through the actual Next.js request proxy when Playwright Chromium and the local app process are available.
