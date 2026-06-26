import { z } from 'zod';

const statusSchema = z.enum(['attending', 'declined']);

const attendeeCountSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Jumlah orang yang hadir harus berupa angka bulat.')
  .transform(Number)
  .refine(Number.isSafeInteger, 'Jumlah orang yang hadir tidak valid.');

export type PersonalRsvpSubmission = {
  attendeeCount: number | null;
  status: 'attending' | 'declined';
};

/** Validates only form shape. The database resolves the actual guest party limit. */
export function parsePersonalRsvpFormData(formData: FormData) {
  const rawStatus = formData.get('status');
  const rawAttendeeCount = formData.get('attendeeCount');
  const status = statusSchema.safeParse(typeof rawStatus === 'string' ? rawStatus : '');

  if (!status.success) {
    return { success: false as const };
  }

  if (status.data === 'declined') {
    return { data: { attendeeCount: null, status: 'declined' } as const, success: true as const };
  }

  const attendeeCount = attendeeCountSchema.safeParse(
    typeof rawAttendeeCount === 'string' ? rawAttendeeCount : '',
  );

  if (!attendeeCount.success) {
    return { success: false as const };
  }

  return {
    data: { attendeeCount: attendeeCount.data, status: 'attending' } as const,
    success: true as const,
  };
}
