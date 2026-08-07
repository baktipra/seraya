import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('native Tamu and Bagikan operational workspace migration', () => {
  it('preserves Tamu action authority across the split controller, state, workspace, and data graph', async () => {
    const [wrapper, controller, actionState, workspace, data, desktopData, mobileData] =
      await Promise.all([
        read('src/components/projects/native-guest-manager.tsx'),
        read('src/components/projects/native-guest-manager-controller.tsx'),
        read('src/components/projects/native-guest-manager-action-state.tsx'),
        read('src/components/projects/native-guest-manager-workspace.tsx'),
        read('src/components/projects/native-guest-manager-data.tsx'),
        read('src/components/projects/native-guest-manager-desktop-data.tsx'),
        read('src/components/projects/native-guest-manager-mobile-data.tsx'),
      ]);
    const graph = [wrapper, controller, actionState, workspace, data, desktopData, mobileData].join('\n');

    for (const contract of [
      'createGuestAction',
      'updateGuestAction',
      'removeGuestAction',
      'importGuestsCsvAction',
      'importGuestsXlsxAction',
      'createOrReplacePersonalGuestLinkAction',
      'reaccessPersonalGuestLinkAction',
      'revokePersonalGuestLinkAction',
      'prepareBatchAction',
      '<OperationalDesktopData',
      '<OperationalMobileDataList',
      '<OperationalSelectionBar',
    ]) {
      expect(graph).toContain(contract);
    }

    expect(wrapper).toContain('useNativeGuestManagerController');
    expect(wrapper).toContain('<NativeGuestManagerWorkspace');
  });

  it('preserves Bagikan readiness, distribution truth, and manual handoff authority across its split graph', async () => {
    const [wrapper, actions, workspace, data, shared] = await Promise.all([
      read('src/components/projects/native-guest-delivery-center.tsx'),
      read('src/components/projects/native-guest-delivery-center-actions.tsx'),
      read('src/components/projects/native-guest-delivery-center-workspace.tsx'),
      read('src/components/projects/native-guest-delivery-center-data.tsx'),
      read('src/components/projects/native-guest-delivery-center-shared.tsx'),
    ]);
    const graph = [wrapper, actions, workspace, data, shared].join('\n');

    for (const contract of [
      'deriveDeliveryReadiness',
      'matchesDeliveryDistributionFilter',
      'buildWhatsAppGuestInviteShareUrl',
      'DeliveryWhatsAppCopyControl',
      'DeliveryBatchPreparationDialog',
      'PersonalLinkReaccessControl',
      '<OperationalDesktopData',
      '<OperationalMobileDataList',
      '<OperationalSelectionBar',
    ]) {
      expect(graph).toContain(contract);
    }

    expect(graph).toContain('Pengiriman tetap dilakukan oleh Anda melalui WhatsApp.');
    expect(graph).toContain('Lanjutkan pengiriman manual di WhatsApp.');
    expect(graph).toContain('belum ditandai sebagai terkirim');
    expect(graph).not.toContain('Pesan sudah terkirim');
    expect(graph).not.toContain('WhatsApp sudah terkirim');
    expect(graph).not.toContain('sudah diterima dan dibaca');
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
