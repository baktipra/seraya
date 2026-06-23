import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MidtransSnapProvider,
  MidtransSnapProviderError,
} from '../providers/midtrans-snap.provider';

describe('MidtransSnapProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends only trusted Snap hosted redirect fields and returns no credential material', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/safe-token',
          token: 'never-return-this-token',
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new MidtransSnapProvider();
    const result = await provider.createCheckout({
      amountIdr: 99000,
      environment: 'sandbox',
      finishRedirectUrl: 'http://localhost:3000/dashboard/project-id/billing/return',
      orderId: 'sry-pay-11111111-1111-4111-8111-111111111111',
      serverKey: 'SB-Mid-server-secret',
    });

    expect(result).toEqual({
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/safe-token',
    });
    expect(JSON.stringify(result)).not.toContain('server-secret');
    expect(JSON.stringify(result)).not.toContain('never-return-this-token');

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions');
    expect(request.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from('SB-Mid-server-secret:').toString('base64')}`,
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(request.body))).toEqual({
      callbacks: {
        finish: 'http://localhost:3000/dashboard/project-id/billing/return',
      },
      item_details: [
        {
          id: 'invitation_activation',
          name: 'Aktivasi undangan Seraya',
          price: 99000,
          quantity: 1,
        },
      ],
      transaction_details: {
        gross_amount: 99000,
        order_id: 'sry-pay-11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('rejects unexpected provider redirect hosts and provider failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ redirect_url: 'https://evil.example/snap/v2/vtweb/token' }), {
          status: 201,
        }),
      ),
    );

    await expect(
      new MidtransSnapProvider().createCheckout({
        amountIdr: 99000,
        environment: 'sandbox',
        finishRedirectUrl: 'http://localhost:3000/dashboard/project-id/billing/return',
        orderId: 'sry-pay-11111111-1111-4111-8111-111111111111',
        serverKey: 'server-key',
      }),
    ).rejects.toBeInstanceOf(MidtransSnapProviderError);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 502 })));

    await expect(
      new MidtransSnapProvider().createCheckout({
        amountIdr: 99000,
        environment: 'production',
        finishRedirectUrl: 'https://seraya.id/dashboard/project-id/billing/return',
        orderId: 'sry-pay-22222222-2222-4222-8222-222222222222',
        serverKey: 'server-key',
      }),
    ).rejects.toBeInstanceOf(MidtransSnapProviderError);
  });
});
