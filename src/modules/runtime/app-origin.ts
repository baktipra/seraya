import 'server-only';

export class ApplicationOriginConfigurationError extends Error {
  constructor() {
    super('Application origin configuration is unavailable.');
    this.name = 'ApplicationOriginConfigurationError';
  }
}

/** Reads only the configured origin; never derives sensitive URLs from Host headers. */
export function getConfiguredApplicationOrigin(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) throw new ApplicationOriginConfigurationError();
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApplicationOriginConfigurationError();
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new ApplicationOriginConfigurationError();
  }
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new ApplicationOriginConfigurationError();
  }
  return parsed.origin;
}

export function buildConfiguredApplicationUrl(pathname: string): string {
  return new URL(pathname, `${getConfiguredApplicationOrigin()}/`).toString();
}
