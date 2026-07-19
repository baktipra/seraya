import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Guest Follow-up Slice B privacy-safe read model contract', () => {
  it('composes the existing delivery authority and exposes no sensitive read-model fields', async () => {
    const [serviceSource, typesSource, segmentationSource] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.service.ts'), 'utf8'),
      readFile(path.resolve(process.cwd(), 'src/modules/follow-up/follow-up.types.ts'), 'utf8'),
      readFile(
        path.resolve(process.cwd(), 'src/modules/follow-up/follow-up-segmentation.ts'),
        'utf8',
      ),
    ]);

    expect(serviceSource).toContain('getGuestDeliveryCenterForVerifiedProject');
    expect(serviceSource).toContain('listGuestFollowUpEventsForVerifiedProject');
    expect(serviceSource).toContain('createFollowUpGuestRows');
    expect(serviceSource).not.toContain('createAdminSupabaseClient');
    expect(segmentationSource).toContain("if (readiness === 'needs_link_update')");
    expect(segmentationSource).toContain("if (readiness === 'needs_whatsapp')");
    expect(segmentationSource).toContain("if (readiness === 'no_personal_invitation')");
    expect(segmentationSource).toContain("if (input.row.rsvpStatus !== 'pending')");
    expect(typesSource).not.toContain('rawPhone');
    expect(typesSource).not.toContain('personalUrl');
    expect(typesSource).not.toContain('tokenCiphertext');
    expect(typesSource).not.toContain('messageBody');
  });
});
