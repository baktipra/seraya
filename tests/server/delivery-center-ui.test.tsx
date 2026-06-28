import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { GuestDeliveryCenter } from '@/components/projects/guest-delivery-center';
import { ToastProvider } from '@/design-system';
import {
  initialDeliveryBatchActionState,
  initialDeliveryLinkActionState,
  initialDeliveryWhatsAppClipboardActionState,
} from '@/modules/delivery/delivery.action-state';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
async function prepareLink() {
  return initialDeliveryLinkActionState;
}
async function prepareBatch() {
  return initialDeliveryBatchActionState;
}
async function copyNumbers() {
  return initialDeliveryWhatsAppClipboardActionState;
}
const summary = {
  activeGuestCount: 5,
  needsLinkUpdateCount: 2,
  needsWhatsAppCount: 1,
  noPersonalInvitationCount: 1,
  readyToDistributeCount: 1,
};

function renderCenter(rows: ComponentProps<typeof GuestDeliveryCenter>['rows']) {
  return renderToStaticMarkup(
    <ToastProvider>
      <GuestDeliveryCenter
        copyWhatsAppNumbersAction={copyNumbers}
        prepareBatchAction={prepareBatch}
        projectId={projectId}
        rows={rows}
        summary={summary}
      />
    </ToastProvider>,
  );
}

describe('SRY-039A Delivery Center readiness UI', () => {
  it('renders the authoritative state labels and only exposes ready-row delivery actions', () => {
    const html = renderCenter([
      {
        displayName: 'Keluarga Budi',
        guestId: 'guest-1',
        groupLabel: 'Keluarga',
        maskedWhatsAppNumber: '+62••••7890',
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        prepareAction: prepareLink,
        reaccessAction: prepareLink,
        rowKey: 0,
        rsvpStatus: 'pending',
        whatsappAvailability: 'available',
      },
      {
        displayName: 'Rani',
        guestId: 'guest-2',
        groupLabel: null,
        maskedWhatsAppNumber: null,
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        prepareAction: prepareLink,
        reaccessAction: prepareLink,
        rowKey: 1,
        rsvpStatus: 'pending',
        whatsappAvailability: 'missing',
      },
      {
        displayName: 'Ayu',
        guestId: 'guest-3',
        groupLabel: null,
        maskedWhatsAppNumber: null,
        personalLinkReaccessState: 'unavailable',
        personalLinkState: 'not_created',
        prepareAction: prepareLink,
        rowKey: 2,
        rsvpStatus: 'pending',
        whatsappAvailability: 'missing',
      },
      {
        displayName: 'Dimas',
        guestId: 'guest-4',
        groupLabel: 'Teman',
        maskedWhatsAppNumber: '+62••••3210',
        personalLinkReaccessState: 'legacy',
        personalLinkState: 'active',
        prepareAction: prepareLink,
        reaccessAction: prepareLink,
        rowKey: 3,
        rsvpStatus: 'pending',
        whatsappAvailability: 'available',
      },
      {
        displayName: 'Bima',
        guestId: 'guest-5',
        groupLabel: 'Keluarga',
        maskedWhatsAppNumber: '+62••••1111',
        personalLinkReaccessState: 'unavailable',
        personalLinkState: 'revoked',
        prepareAction: prepareLink,
        reaccessAction: prepareLink,
        rowKey: 4,
        rsvpStatus: 'pending',
        whatsappAvailability: 'available',
      },
    ]);

    expect(html).toContain('<table');
    expect(html).toContain('Pilih semua tamu pada hasil aktif');
    expect(html).toContain('Siap dibagikan');
    expect(html).toContain('Butuh nomor WhatsApp');
    expect(html).toContain('Belum punya Undangan Pribadi');
    expect(html).toContain('Tautan perlu diperbarui');
    expect(html).toContain('Kelola di Tamu');
    expect(html).toContain('Lengkapi di Tamu');
    expect(html).toContain('Copy');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('+62••••7890');
    expect(html).not.toContain('+6281234567890');
    expect(html).not.toContain('Terkirim berhasil');
    expect(html).not.toContain('Dibaca');
    expect(html).not.toContain('Perbarui tautan');
    expect(html).not.toContain('Buat ulang tautan');
  });

  it('does not expose copy, open, WhatsApp, or preparation controls for lifecycle-blocked or no-WhatsApp rows', () => {
    const noWhatsAppHtml = renderCenter([
      {
        displayName: 'Rani',
        guestId: 'guest-2',
        groupLabel: null,
        maskedWhatsAppNumber: null,
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        prepareAction: prepareLink,
        reaccessAction: prepareLink,
        rowKey: 0,
        rsvpStatus: 'pending',
        whatsappAvailability: 'missing',
      },
    ]);
    const revokedHtml = renderCenter([
      {
        displayName: 'Bima',
        guestId: 'guest-5',
        groupLabel: null,
        maskedWhatsAppNumber: '+62••••1111',
        personalLinkReaccessState: 'unavailable',
        personalLinkState: 'revoked',
        prepareAction: prepareLink,
        reaccessAction: prepareLink,
        rowKey: 0,
        rsvpStatus: 'pending',
        whatsappAvailability: 'available',
      },
    ]);

    for (const html of [noWhatsAppHtml, revokedHtml]) {
      expect(html).not.toContain('name="operation"');
      expect(html).not.toContain('value="copy"');
      expect(html).not.toContain('value="open"');
      expect(html).not.toContain('value="share"');
      expect(html).not.toContain('Buka undangan');
      expect(html).not.toContain('>Siapkan Undangan Pribadi<');
    }
    expect(noWhatsAppHtml).toContain('Lengkapi di Tamu');
    expect(revokedHtml).toContain('Kelola di Tamu');
  });

  it('keeps stale selection impossible after search or readiness filter changes and leaves lifecycle in Tamu', async () => {
    const [deliverySource, guestsSource] = await Promise.all([
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/guest-delivery-center.tsx'),
        'utf8',
      ),
      readFile(path.resolve(process.cwd(), 'src/components/projects/guest-manager.tsx'), 'utf8'),
    ]);

    expect(deliverySource).toMatch(/function updateQuery[\s\S]*?setSelectedIds\(\[\]\)/u);
    expect(deliverySource).toMatch(/function updateReadinessFilter[\s\S]*?setSelectedIds\(\[\]\)/u);
    expect(deliverySource).toContain("readinessFilter === 'no_personal_invitation'");
    expect(deliverySource).toContain("readinessFilter === 'ready_to_distribute'");
    expect(deliverySource).not.toContain('Perbarui tautan');
    expect(deliverySource).not.toContain('Buat ulang tautan');
    expect(guestsSource).toContain('createOrReplacePersonalGuestLinkAction');
    expect(guestsSource).toContain('revokePersonalGuestLinkAction');
  });

  it('preserves the factual no-guest guidance toward Tamu', () => {
    const html = renderCenter([]);

    expect(html).toContain('Belum ada tamu yang disiapkan');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
  });
});
