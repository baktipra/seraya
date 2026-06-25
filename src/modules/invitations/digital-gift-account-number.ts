/**
 * Normalizes only presentation separators accepted by the Amplop Digital
 * contract. Validation remains in the invitation draft schema so the exact
 * same server-side path protects every editor save and published snapshot.
 */
export function normalizeDigitalGiftAccountNumber(value: string): string {
  return value.replace(/[ \-]/g, '');
}
