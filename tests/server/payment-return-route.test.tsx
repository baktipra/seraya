import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import PaymentReturnPage from '@/app/(dashboard)/dashboard/[projectId]/billing/return/page';

describe('SRY-010 payment return route', () => {
  it('renders only the pending-confirmation message and a project return action', async () => {
    const page = await PaymentReturnPage({
      params: Promise.resolve({ projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Terima kasih, pembayaran kalian sedang diproses.');
    expect(html).toContain('Menunggu konfirmasi pembayaran');
    expect(html).toContain('Kembali ke project');
    expect(html).not.toContain('Pembayaran berhasil');
    expect(html).not.toContain('Lunas');
  });

  it('does not read redirect query data or invoke a payment mutation', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const source = await readFile(
      path.resolve(
        testDirectory,
        '../../src/app/(dashboard)/dashboard/[projectId]/billing/return/page.tsx',
      ),
      'utf8',
    );

    expect(source).not.toContain('searchParams');
    expect(source).not.toContain('payment_transactions');
    expect(source).not.toContain('startPaymentCheckout');
    expect(source).not.toContain('publishInvitation');
  });
});
