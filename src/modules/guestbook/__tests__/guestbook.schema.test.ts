import { describe, expect, it } from 'vitest';

import {
  GUESTBOOK_MESSAGE_MAX_LENGTH,
  parsePersonalGuestbookFormData,
  personalGuestbookSubmissionSchema,
} from '../guestbook.schema';

describe('guestbook v2 plain-text and sharing consent contract', () => {
  it('trims outer whitespace and preserves explicit consent', () => {
    const parsed = personalGuestbookSubmissionSchema.parse({
      message: '  Semoga bahagia selalu!\n💐  ',
      shareWithGuests: true,
    });

    expect(parsed).toEqual({
      message: 'Semoga bahagia selalu!\n💐',
      shareWithGuests: true,
    });
  });

  it('maps an unchecked sharing checkbox to private by default', () => {
    const formData = new FormData();
    formData.set('message', 'Doa terbaik untuk kalian.');

    const parsed = parsePersonalGuestbookFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.shareWithGuests).toBe(false);
  });

  it('rejects empty, whitespace-only, and too-long content', () => {
    const input = (message: string) => ({ message, shareWithGuests: false });
    expect(personalGuestbookSubmissionSchema.safeParse(input('')).success).toBe(false);
    expect(personalGuestbookSubmissionSchema.safeParse(input(' \n\t ')).success).toBe(false);
    expect(
      personalGuestbookSubmissionSchema.safeParse(input('a'.repeat(GUESTBOOK_MESSAGE_MAX_LENGTH + 1))).success,
    ).toBe(false);
  });

  it('keeps HTML-looking text as plain text for React escaping', () => {
    const parsed = personalGuestbookSubmissionSchema.parse({
      message: '<script>alert(1)</script> Semoga bahagia',
      shareWithGuests: false,
    });

    expect(parsed.message).toBe('<script>alert(1)</script> Semoga bahagia');
  });
});
