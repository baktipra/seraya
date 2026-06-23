import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(process.cwd(), 'src');

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(fullPath);
      }

      return /\.(?:ts|tsx)$/.test(entry.name) ? [fullPath] : [];
    }),
  );

  return nested.flat();
}

describe('SRY-011A webhook source boundary', () => {
  it('has no direct application payment-status assignment to paid outside the verified database boundary', async () => {
    const files = await collectSourceFiles(sourceRoot);
    const directPaidAssignments: string[] = [];

    for (const file of files) {
      if (file.includes(`${path.sep}__tests__${path.sep}`)) {
        continue;
      }

      const source = await readFile(file, 'utf8');

      if (/(?:status|targetStatus)\s*:\s*['\"]paid['\"]/.test(source)) {
        directPaidAssignments.push(path.relative(sourceRoot, file));
      }
    }

    // Mapping a verified provider status to the value happens through the
    // webhook service variable, never through a browser/page/action assignment.
    expect(directPaidAssignments).toEqual([]);
  });

  it('keeps paid mapping and server-only application in the webhook boundary', async () => {
    const mapping = await readFile(
      path.join(sourceRoot, 'modules/payments/midtrans-webhook.types.ts'),
      'utf8',
    );
    const service = await readFile(
      path.join(sourceRoot, 'modules/payments/midtrans-webhook.service.ts'),
      'utf8',
    );

    expect(mapping).toContain("return 'paid'");
    expect(service).toContain('applyVerifiedMidtransWebhookWithAdmin');
    expect(service).toContain("import 'server-only'");
  });

  it('does not let the return route or query parameters mutate payment state', async () => {
    const returnRoute = await readFile(
      path.join(sourceRoot, 'app/(dashboard)/dashboard/[projectId]/billing/return/page.tsx'),
      'utf8',
    );
    const webhookRoute = await readFile(
      path.join(sourceRoot, 'app/api/webhooks/midtrans/route.ts'),
      'utf8',
    );

    expect(returnRoute).not.toContain('payment_transactions');
    expect(returnRoute).not.toContain('searchParams');
    expect(webhookRoute).not.toContain('cookies(');
    expect(webhookRoute).not.toContain('searchParams');
  });
});
