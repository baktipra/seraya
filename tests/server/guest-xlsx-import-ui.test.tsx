import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

describe('SRY-036 owner XLSX import preparation UI', () => {
  it('makes Excel the recommended path, preserves CSV as an alternate, and points successful preparation toward Delivery Center', () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <GuestManager
          initialGuests={[]}
          prepareBatchAction={async () => initialDeliveryBatchActionState}
          projectId={projectId}
        />
      </ToastProvider>,
    );

    expect(html).toContain('Import Excel (.xlsx)');
    expect(html).toContain('Import CSV');
    expect(html).toContain('Download template Excel');
    expect(html).toContain(`href="/dashboard/${projectId}/guests/template"`);
    expect(html).toContain('Hanya sheet bernama Tamu yang diproses.');
    expect(html).toContain(
      'Import tidak otomatis mengirim WhatsApp atau membuat Undangan Pribadi.',
    );
    expect(html).not.toContain('Kirim WhatsApp otomatis');
  });
});
