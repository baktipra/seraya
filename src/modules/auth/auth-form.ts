import type { SerayaSupabaseClient } from '@/server/supabase/types';

export type MagicLinkRequestResult =
  | { status: 'sent' }
  | { message: string; status: 'error' }
  | { message: string; status: 'invalid' };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginEmail(email: string): string | null {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    return 'Masukkan alamat email kamu terlebih dahulu.';
  }

  if (!emailPattern.test(normalizedEmail)) {
    return 'Masukkan alamat email yang valid.';
  }

  return null;
}

export async function requestMagicLink({
  callbackUrl,
  email,
  supabase,
}: {
  callbackUrl: string;
  email: string;
  supabase: SerayaSupabaseClient;
}): Promise<MagicLinkRequestResult> {
  const validationMessage = validateLoginEmail(email);

  if (validationMessage) {
    return { message: validationMessage, status: 'invalid' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return {
      message: 'Kami belum bisa mengirim link masuk. Coba lagi sebentar lagi.',
      status: 'error',
    };
  }

  return { status: 'sent' };
}
