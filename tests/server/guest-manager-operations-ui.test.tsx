import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system')>();
  return {
    ...actual,
    Dialog: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  };
});

import { GuestManager } from '@/components/projects/guest-manager';
import { ToastProvider } from '@/design-system';
import { initialDeliveryBatchActionState } from '@/modules/delivery/delivery.action-state';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('SRY-038 Guest Manager compact operations table', () => {
  it('uses compact table semantics, scoped selection, XLSX export, and preserves existing guest actions', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestManager
          initialGuests={[
            {
              display_name: 'Rani',
              group_label: 'Keluarga',
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              link_state: 'active',
              party_size: 2,
              rsvp_attendee_count: null,
              rsvp_status: 'pending',
              whatsapp_phone_e164: '+6281234567890',
            },
          ]}
          prepareBatchAction={async () => initialDeliveryBatchActionState}
          projectId={projectId}
        />
      </ToastProvider>,
    );

    expect(html).toContain('<table');
    expect(html).toContain('Pilih semua tamu pada hasil aktif');
    expect(html).toContain('Nama Tamu');
    expect(html).toContain('Undangan Pribadi');
    expect(html).toContain('Export Excel (.xlsx)');
    expect(html).toContain('0 tamu terpilih');
    expect(html).toContain('Siapkan Undangan Pribadi');
    expect(html).toContain('Aksi untuk Rani');
    expect(html).toContain('Cari tamu');
    expect(html).toContain('Filter operasional');
    expect(html).toContain('Belum punya nomor WhatsApp');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });
});
