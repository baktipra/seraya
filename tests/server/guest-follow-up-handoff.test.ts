import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Guest Follow-up Slice C manual handoff source contract', () => {
  it('records a truthful event before returning temporary capability material', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.service.ts'),
      'utf8',
    );

    expect(source).toContain('getCurrentPublishedInvitationForVerifiedProject');
    expect(source).toContain('reaccessPersonalGuestLinkForVerifiedGuest');
    expect(source).toContain("eventType: 'handoff_prepared'");
    expect(source).toContain("sourceSurface: 'follow_up_center'");
    expect(source.indexOf('await appendGuestFollowUpEventForVerifiedProject')).toBeLessThan(
      source.lastIndexOf('return handoff'),
    );
    expect(source).not.toContain('metadata: { personalUrl');
    expect(source).not.toContain('metadata: { messageText');
    expect(source).not.toContain(
      'recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,\n    metadata',
    );
  });

  it('keeps the action truthful and exposes no raw phone field', async () => {
    const [actionSource, stateSource] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.actions.ts'), 'utf8'),
      readFile(
        path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.action-state.ts'),
        'utf8',
      ),
    ]);

    expect(actionSource).toContain('Handoff WhatsApp disiapkan.');
    expect(actionSource).not.toMatch(
      /pesan sudah dikirim|WhatsApp sudah terkirim|sudah diterima|sudah dibaca/iu,
    );
    expect(actionSource).not.toContain('console.error(error)');
    expect(stateSource).not.toContain('recipientWhatsAppPhoneE164');
    expect(stateSource).not.toContain('rawPhone');
  });

  it('uses deterministic local copy instead of AI or network generation', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/modules/follow-up/follow-up-handoff.ts'),
      'utf8',
    );

    expect(source).toContain('buildInitialInvitationMessage');
    expect(source).toContain('buildRsvpReminderMessage');
    expect(source).toContain('buildEventReminderMessage');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('openai');
    expect(source).not.toContain('generateText');
    expect(source).not.toContain('process.env');
  });
});
