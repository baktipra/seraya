import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { processWebhookMock } = vi.hoisted(() => ({ processWebhookMock: vi.fn() }));

vi.mock('@/modules/payments/midtrans-webhook.service', () => ({
  MidtransWebhookSignatureError: class MidtransWebhookSignatureError extends Error {},
  MidtransWebhookUnavailableError: class MidtransWebhookUnavailableError extends Error {},
  processVerifiedMidtransWebhook: processWebhookMock,
}));
vi.mock('@/modules/payments/payment.repository', () => ({
  PaymentWebhookNotMatchedError: class PaymentWebhookNotMatchedError extends Error {},
}));

import { POST } from '@/app/api/webhooks/midtrans/route';
import { MidtransWebhookSignatureError } from '@/modules/payments/midtrans-webhook.service';

function chunkedJsonRequest(body: string, contentLength?: string) {
  const bytes = new TextEncoder().encode(body);
  const splitAt = Math.max(1, Math.floor(bytes.byteLength / 2));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, splitAt));
      controller.enqueue(bytes.slice(splitAt));
      controller.close();
    },
  });

  return new Request('http://seraya.test/api/webhooks/midtrans', {
    body: stream,
    ...({ duplex: 'half' } as Record<string, string>),
    headers: {
      'content-type': 'application/json',
      ...(contentLength ? { 'content-length': contentLength } : {}),
    },
    method: 'POST',
  });
}

function payload() {
  const orderId = 'sry-pay-11111111-1111-4111-8111-111111111111';
  const statusCode = '200';
  const grossAmount = '99000.00';
  const key = 'route-test-key';

  return {
    gross_amount: grossAmount,
    order_id: orderId,
    signature_key: createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${key}`)
      .digest('hex'),
    status_code: statusCode,
    transaction_status: 'settlement',
  };
}

describe('Midtrans webhook route', () => {
  beforeEach(() => {
    processWebhookMock.mockReset().mockResolvedValue({ duplicate: false });
  });

  it('accepts parsed webhook input with a small acknowledgement only', async () => {
    const response = await POST(
      new Request('http://seraya.test/api/webhooks/midtrans', {
        body: JSON.stringify(payload()),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(processWebhookMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: payload().order_id }),
    );
  });

  it('rejects an oversized declared body before verification', async () => {
    const response = await POST(
      new Request('http://seraya.test/api/webhooks/midtrans', {
        body: JSON.stringify(payload()),
        headers: { 'content-type': 'application/json', 'content-length': String(1024 * 1024 + 1) },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(processWebhookMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized body when Content-Length is absent', async () => {
    const response = await POST(chunkedJsonRequest(`{"padding":"${'x'.repeat(1024 * 1024 + 1)}"}`));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(processWebhookMock).not.toHaveBeenCalled();
  });

  it('rejects chunked oversized body when Content-Length is misleading', async () => {
    const response = await POST(
      chunkedJsonRequest(`{"padding":"${'x'.repeat(1024 * 1024 + 1)}"}`, '12'),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(processWebhookMock).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and does not process it', async () => {
    const response = await POST(
      new Request('http://seraya.test/api/webhooks/midtrans', {
        body: '{not-json',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    expect(processWebhookMock).not.toHaveBeenCalled();
  });

  it('returns generic malformed JSON response without body details', async () => {
    const rawBody = '{malformed webhook payload';
    const response = await POST(
      new Request('http://seraya.test/api/webhooks/midtrans', {
        body: rawBody,
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    const responseText = await response.text();
    expect(responseText).toBe('{"ok":false}');
    expect(responseText).not.toContain(rawBody);
    expect(responseText).not.toContain('signature');
    expect(responseText).not.toContain('config');
  });

  it('rejects invalid signatures without exposing details', async () => {
    processWebhookMock.mockRejectedValue(new MidtransWebhookSignatureError());

    const response = await POST(
      new Request('http://seraya.test/api/webhooks/midtrans', {
        body: JSON.stringify(payload()),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });

  it('has no auth/session/query-based payment mutation boundary', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/app/api/webhooks/midtrans/route.ts', 'utf8'),
    );

    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('searchParams');
    expect(source).not.toContain('signature_key');
  });
});
