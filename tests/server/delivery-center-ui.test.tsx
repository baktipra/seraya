import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { GuestDeliveryCenter } from '@/components/projects/guest-delivery-center';
import { ToastProvider } from '@/design-system';
import { initialDeliveryLinkActionState } from '@/modules/delivery/delivery.action-state';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

async function prepareLink() {
  return initialDeliveryLinkActionState;
}

describe('SRY-029 owner Delivery Center UI', () => {
  it('renders factual readiness, masked WhatsApp, link status, and manual preparation controls', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestDeliveryCenter
          isPublished
          projectId={projectId}
          rows={[
            {
              displayName: 'Keluarga Budi',
              groupLabel: 'Keluarga',
              maskedWhatsAppNumber: '+62••••7890',
              personalLinkState: 'active',
              prepareAction: prepareLink,
              rowKey: 0,
              whatsappAvailability: 'available',
            },
            {
              displayName: 'Rani',
              groupLabel: null,
              maskedWhatsAppNumber: null,
              personalLinkState: 'not_created',
              prepareAction: prepareLink,
              rowKey: 1,
              whatsappAvailability: 'missing',
            },
          ]}
          summary={{
            activeGuestCount: 2,
            activePersonalLinkCount: 1,
            whatsappAvailableCount: 1,
            whatsappMissingCount: 1,
          }}
        />
      </ToastProvider>,
    );

    expect(html).toContain('Pusat Pengiriman');
    expect(html).toContain(
      'Undangan Pribadi menyertakan sapaan, RSVP, dan ucapan tamu. Buat atau perbarui link untuk tamu sebelum membagikannya.',
    );
    expect(html).toContain('Tamu aktif');
    expect(html).toContain('Nomor WhatsApp tersedia');
    expect(html).toContain('Tautan aktif');
    expect(html).toContain('Nomor WhatsApp belum tersedia');
    expect(html).toContain('WhatsApp tersedia');
    expect(html).toContain('Nomor WhatsApp belum tersedia');
    expect(html).toContain('+62••••7890');
    expect(html).not.toContain('+6281234567890');
    expect(html).toContain('Tautan aktif');
    expect(html).toContain('Belum dibuat');
    expect(html).toContain('Buat ulang tautan &amp; bagikan');
    expect(html).toContain('Buat tautan &amp; bagikan');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).toContain('Lengkapi nomor');
    expect(html).not.toContain('Terkirim berhasil');
    expect(html).not.toContain('Dibaca');
    expect(html).not.toContain('Pengingat');
  });

  it('keeps unpublished projects operationally visible but blocks preparation with the factual notice', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestDeliveryCenter
          isPublished={false}
          projectId={projectId}
          rows={[]}
          summary={{
            activeGuestCount: 0,
            activePersonalLinkCount: 0,
            whatsappAvailableCount: 0,
            whatsappMissingCount: 0,
          }}
        />
      </ToastProvider>,
    );

    expect(html).toContain('Bagikan tersedia setelah undangan diterbitkan');
    expect(html).toContain(
      'Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan undangan pribadi.',
    );
    expect(html).toContain(`href="/dashboard/${projectId}"`);
  });

  it('explains that RSVP requires guests and Undangan Pribadi when no active guests exist', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestDeliveryCenter
          isPublished
          projectId={projectId}
          rows={[]}
          summary={{
            activeGuestCount: 0,
            activePersonalLinkCount: 0,
            whatsappAvailableCount: 0,
            whatsappMissingCount: 0,
          }}
        />
      </ToastProvider>,
    );

    expect(html).toContain('Untuk menerima RSVP, tambahkan tamu lalu buat Undangan Pribadi.');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).toContain('Kelola Tamu');
    expect(html).not.toContain('Link Publik cukup untuk RSVP');
  });

  it('keeps raw links and full phone numbers confined to the immediate result, with no browser persistence or custom send runtime', async () => {
    const source = await readFile(
      path.join(process.cwd(), 'src/components/projects/guest-delivery-center.tsx'),
      'utf8',
    );

    expect(source).toContain('<PersonalGuestLinkResultActions');
    expect(source).toContain('open={Boolean(revealedPersonalLink)}');
    expect(source).toContain('personalUrl={revealedPersonalLink.personalUrl}');
    expect(source).toContain(
      'recipientWhatsAppPhoneE164={revealedPersonalLink.recipientWhatsAppPhoneE164}',
    );
    expect(source).toContain('confirmActiveReplacement');
    expect(source).toContain(
      'Tautan aktif sebelumnya akan berhenti berlaku setelah tautan baru dibuat.',
    );
    expect(source).not.toContain('guestId');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('document.cookie');
    expect(source).not.toContain('router.prefetch');
    expect(source).not.toContain('fetch(');
  });
});
