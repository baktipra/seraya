'use client';

import { useState, type FormEvent } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/design-system';
import { requestMagicLink } from '@/modules/auth/auth-form';
import { createAuthCallbackUrl } from '@/modules/auth/redirects';
import { createBrowserSupabaseClient } from '@/server/supabase/browser';

export interface LoginFormProps {
  initialNotice?: string | null;
  nextPath: string;
}

type LoginStatus = 'idle' | 'sending' | 'sent' | 'error';

export function LoginForm({ initialNotice = null, nextPath }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(initialNotice);
  const [status, setStatus] = useState<LoginStatus>('idle');

  const callbackUrl =
    typeof window === 'undefined'
      ? '/auth/callback'
      : createAuthCallbackUrl(window.location.origin, nextPath);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage(null);

    try {
      const result = await requestMagicLink({
        callbackUrl,
        email,
        supabase: createBrowserSupabaseClient(),
      });

      if (result.status === 'sent') {
        setStatus('sent');
        setMessage('Link masuk sudah dikirim. Periksa email kamu untuk melanjutkan.');
        return;
      }

      setStatus('error');
      setMessage(result.message);
    } catch {
      setStatus('error');
      setMessage('Kami belum bisa mengirim link masuk. Coba lagi sebentar lagi.');
    }
  }

  async function handleGoogleSignIn() {
    setStatus('sending');
    setMessage(null);

    try {
      const { data, error } = await createBrowserSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error || !data.url) {
        setStatus('error');
        setMessage('Kami belum bisa membuka masuk dengan Google. Coba lagi sebentar lagi.');
        return;
      }

      window.location.assign(data.url);
    } catch {
      setStatus('error');
      setMessage('Kami belum bisa membuka masuk dengan Google. Coba lagi sebentar lagi.');
    }
  }

  const isSending = status === 'sending';

  return (
    <Card aria-labelledby="login-title" className="w-full max-w-md">
      <CardHeader className="gap-3">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Ruang pasangan
        </p>
        <CardTitle id="login-title" className="text-3xl sm:text-[2rem]">
          Masuk ke Seraya
        </CardTitle>
        <CardDescription className="text-base">
          Kelola undangan dan tamu dalam satu tempat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleMagicLink}>
          <div className="space-y-2">
            <label className="text-seraya-text-primary text-sm font-semibold" htmlFor="login-email">
              Email
            </label>
            <Input
              autoComplete="email"
              disabled={isSending || status === 'sent'}
              id="login-email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@contoh.com"
              type="email"
              value={email}
            />
          </div>

          {message ? (
            <p
              aria-live="polite"
              className={
                status === 'error'
                  ? 'text-seraya-status-error text-sm leading-6'
                  : 'text-seraya-text-secondary text-sm leading-6'
              }
              role={status === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          ) : null}

          <Button fullWidth loading={isSending} type="submit">
            Kirim link masuk
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <div className="bg-seraya-border-default h-px flex-1" />
          <span className="text-seraya-text-muted text-xs">atau</span>
          <div className="bg-seraya-border-default h-px flex-1" />
        </div>

        <Button
          disabled={isSending || status === 'sent'}
          fullWidth
          onClick={handleGoogleSignIn}
          type="button"
          variant="secondary"
        >
          <GoogleMark />
          Lanjutkan dengan Google
        </Button>
      </CardContent>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M21.35 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.93 2.92v2.79h3.12c1.83-1.69 2.94-4.18 2.94-7.14Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.75c2.62 0 4.81-.87 6.41-2.37l-3.12-2.42c-.87.58-1.98.92-3.29.92-2.53 0-4.68-1.7-5.45-4.01H3.33v2.88A9.67 9.67 0 0 0 12 21.75Z"
        fill="#34A853"
      />
      <path
        d="M6.55 13.87a5.8 5.8 0 0 1 0-3.74V7.25H3.33a9.74 9.74 0 0 0 0 9.5l3.22-2.88Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.12c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.8 3.2 14.62 2.25 12 2.25a9.67 9.67 0 0 0-8.67 5l3.22 2.88C7.32 7.82 9.47 6.12 12 6.12Z"
        fill="#EA4335"
      />
    </svg>
  );
}
