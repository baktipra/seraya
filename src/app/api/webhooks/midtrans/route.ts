import { ZodError } from 'zod';

import { parseMidtransWebhookNotification } from '@/modules/payments/midtrans-webhook.schema';
import {
  MidtransWebhookSignatureError,
  MidtransWebhookUnavailableError,
  processVerifiedMidtransWebhook,
} from '@/modules/payments/midtrans-webhook.service';
import { PaymentWebhookNotMatchedError } from '@/modules/payments/payment.repository';

export const runtime = 'nodejs';

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

function acknowledgement(status: number, ok: boolean) {
  return Response.json(
    { ok },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}

function isJsonContentType(request: Request) {
  const contentType = request.headers.get('content-type');
  return contentType?.toLowerCase().startsWith('application/json') ?? false;
}

class WebhookBodyTooLargeError extends Error {}

async function readBoundedJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new WebhookBodyTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError('Missing request body');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel();
        throw new WebhookBodyTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

/**
 * Midtrans calls this machine-to-machine endpoint. It intentionally has no
 * session/cookie dependency and returns no provider payload, signature, or
 * internal payment metadata.
 */
export async function POST(request: Request) {
  if (!isJsonContentType(request)) return acknowledgement(415, false);
  let body: unknown;

  try {
    body = await readBoundedJsonBody(request);
  } catch (error) {
    if (error instanceof WebhookBodyTooLargeError) return acknowledgement(413, false);
    return acknowledgement(400, false);
  }

  try {
    const notification = parseMidtransWebhookNotification(body);
    await processVerifiedMidtransWebhook(notification);
    return acknowledgement(200, true);
  } catch (error) {
    if (error instanceof ZodError) {
      return acknowledgement(400, false);
    }

    if (error instanceof MidtransWebhookSignatureError) {
      return acknowledgement(401, false);
    }

    if (error instanceof PaymentWebhookNotMatchedError) {
      return acknowledgement(404, false);
    }

    if (error instanceof MidtransWebhookUnavailableError) {
      return acknowledgement(503, false);
    }

    return acknowledgement(500, false);
  }
}
