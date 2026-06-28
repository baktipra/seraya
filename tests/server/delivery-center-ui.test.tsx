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
  activeGuestCount: 2,
  activePersonalLinkCount: 1,
  guestsWithoutActivePersonalLinkCount: 1,
  whatsappAvailableCount: 1,
  whatsappMissingCount: 1,
};

describe('SRY-038 owner Delivery Center table UI', () => {
  it('renders a compact table, scoped row selection, and safe recoverable/legacy actions', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestDeliveryCenter
          copyWhatsAppNumbersAction={copyNumbers}
          isPublished
          prepareBatchAction={prepareBatch}
          projectId={projectId}
          rows={[
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
              personalLinkReaccessState: 'unavailable',
              personalLinkState: 'not_created',
              prepareAction: prepareLink,
              reaccessAction: prepareLink,
              rowKey: 1,
              rsvpStatus: 'pending',
              whatsappAvailability: 'missing',
            },
            {
              displayName: 'Dimas',
              guestId: 'guest-3',
              groupLabel: 'Teman',
              maskedWhatsAppNumber: '+62••••3210',
              personalLinkReaccessState: 'legacy',
              personalLinkState: 'active',
              prepareAction: prepareLink,
              reaccessAction: prepareLink,
              rowKey: 2,
              rsvpStatus: 'pending',
              whatsappAvailability: 'available',
            },
          ]}
          summary={summary}
        />
      </ToastProvider>,
    );
    expect(html).toContain('data-delivery-center-table');
    expect(html).toContain('<table');
    expect(html).toContain('Pilih semua tamu pada hasil aktif');
    expect(html).toContain('0 tamu terpilih');
    expect(html).toContain('Copy');
    expect(html).toContain('Tautan lama belum dapat disalin');
    expect(html).toContain('Perbarui tautan');
    expect(html).toContain('Buka undangan');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Copy nomor WhatsApp');
    expect(html).toContain('Export Excel (.xlsx)');
    expect(html).toContain('+62••••7890');
    expect(html).not.toContain('+6281234567890');
    expect(html).not.toContain('Terkirim berhasil');
    expect(html).not.toContain('Dibaca');
  });

  it('preserves the factual no-guest RSVP guidance', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestDeliveryCenter
          copyWhatsAppNumbersAction={copyNumbers}
          isPublished
          prepareBatchAction={prepareBatch}
          projectId={projectId}
          rows={[]}
          summary={{
            activeGuestCount: 0,
            activePersonalLinkCount: 0,
            guestsWithoutActivePersonalLinkCount: 0,
            whatsappAvailableCount: 0,
            whatsappMissingCount: 0,
          }}
        />
      </ToastProvider>,
    );
    expect(html).toContain('Belum ada tamu untuk disiapkan');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
  });
});
