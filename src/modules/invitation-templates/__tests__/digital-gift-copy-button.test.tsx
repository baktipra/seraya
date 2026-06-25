import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DigitalGiftCopyButton } from '../digital-gift-copy-button';

describe('SRY-026 Amplop Digital copy control', () => {
  it('renders only the supplied account number as a local accessible copy control', () => {
    const html = renderToStaticMarkup(
      <DigitalGiftCopyButton accountNumber="123456789012" className="gift-copy" />,
    );

    expect(html).toContain('Salin nomor');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('guestToken');
    expect(html).not.toContain('wa.me');
  });

  it('uses clipboard then a browser fallback without sending, storing, or tracking anything', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/modules/invitation-templates/digital-gift-copy-button.tsx'),
      'utf8',
    );

    expect(source).toContain('navigator.clipboard.writeText(accountNumber)');
    expect(source).toContain("document.execCommand('copy')");
    expect(source).toContain('Nomor berhasil disalin.');
    expect(source).toContain('Nomor belum bisa disalin. Silakan salin secara manual.');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('axios');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('console.');
  });
});
