import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('native Tamu and Bagikan operational workspace migration', () => {
  it('preserves Tamu actions while using native operational composition', async () => {
    const source = await read('src/components/projects/native-guest-manager.tsx');

    for (const contract of [
      'createGuestAction',
      'updateGuestAction',
      'removeGuestAction',
      'importGuestsCsvAction',
      'importGuestsXlsxAction',
      'createOrReplacePersonalGuestLinkAction',
      'revokePersonalGuestLinkAction',
      'prepareBatchAction',
      '<OperationalDesktopData>',
      '<OperationalMobileDataList>',
      '<OperationalSelectionBar',
    ]) {
      expect(source).toContain(contract);
    }
  });

  it('preserves Bagikan readiness and truthful manual handoff authority', async () => {
    const source = await read('src/components/projects/native-guest-delivery-center.tsx');

    for (const contract of [
      'deriveDeliveryReadiness',
      'matchesDeliveryReadinessFilter',
      'buildWhatsAppGuestInviteShareUrl',
      'DeliveryWhatsAppCopyControl',
      'DeliveryBatchPreparationDialog',
      'PersonalLinkReaccessControl',
      '<OperationalDesktopData>',
      '<OperationalMobileDataList>',
      '<OperationalSelectionBar',
    ]) {
      expect(source).toContain(contract);
    }

    expect(source).toContain('Pembagian WhatsApp');
    expect(source).toContain('tetap dilakukan manual per tamu.');
    expect(source).not.toContain('sudah terkirim');
    expect(source).not.toContain('sudah diterima');
  });

  it('keeps deleted compatibility CSS absent and routes on native components', async () => {
    const [globals, responsive, primitives, guestsRoute, deliveryRoute] = await Promise.all([
      read('src/app/globals.css'),
      read('src/app/workspace-responsive.css'),
      read('src/components/workspace/operational-primitives.tsx'),
      read('src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx'),
      read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx'),
    ]);

    await expect(
      access(path.resolve(process.cwd(), 'src/app/romantic-clarity-consistency.css')),
    ).rejects.toThrow();

    for (const source of [responsive, primitives, guestsRoute, deliveryRoute]) {
      expect(source).not.toContain('OperationalLegacyBridge');
      expect(source).not.toContain('data-operational-legacy-bridge');
    }

    expect(globals).not.toContain('guest-manager-romantic-clarity.css');
    expect(globals).not.toContain('delivery-center-romantic-clarity.css');
    expect(guestsRoute).toContain('NativeGuestManager');
    expect(deliveryRoute).toContain('NativeGuestDeliveryCenter');
  });
});
