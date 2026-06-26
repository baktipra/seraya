import { describe, expect, it } from 'vitest';

import {
  GUESTBOOK_MESSAGE_MAX_LENGTH,
  personalGuestbookSubmissionSchema,
} from '../guestbook.schema';

describe('SRY-027 guestbook plain-text message contract', () => {
  it('trims only outer whitespace while preserving internal line breaks and emoji', () => {
    const parsed = personalGuestbookSubmissionSchema.parse({
      message: '  Semoga bahagia selalu!\n💐  ',
    });

    expect(parsed.message).toBe('Semoga bahagia selalu!\n💐');
  });

  it('rejects empty, whitespace-only, and too-long content', () => {
    expect(personalGuestbookSubmissionSchema.safeParse({ message: '' }).success).toBe(false);
    expect(personalGuestbookSubmissionSchema.safeParse({ message: ' \n\t ' }).success).toBe(false);
    expect(
      personalGuestbookSubmissionSchema.safeParse({
        message: 'a'.repeat(GUESTBOOK_MESSAGE_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('keeps HTML-looking text as plain text for React escaping rather than interpreting it', () => {
    const parsed = personalGuestbookSubmissionSchema.parse({
      message: '<script>alert(1)</script> Semoga bahagia',
    });

    expect(parsed.message).toBe('<script>alert(1)</script> Semoga bahagia');
  });
});
