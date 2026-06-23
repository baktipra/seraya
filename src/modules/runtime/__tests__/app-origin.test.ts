import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildConfiguredApplicationUrl,
  getConfiguredApplicationOrigin,
  ApplicationOriginConfigurationError,
} from '../app-origin';

const beforeUrl = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => {
  if (beforeUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = beforeUrl;
  vi.unstubAllEnvs();
});
describe('configured application origin', () => {
  it('uses configured origin and never request-derived input', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://seraya.example';
    expect(buildConfiguredApplicationUrl('/x')).toBe('https://seraya.example/x');
  });
  it('rejects invalid or insecure production origin safely', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'javascript:alert(1)';
    expect(() => getConfiguredApplicationOrigin()).toThrow(ApplicationOriginConfigurationError);
    process.env.NEXT_PUBLIC_APP_URL = 'http://seraya.example';
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getConfiguredApplicationOrigin()).toThrow(ApplicationOriginConfigurationError);
  });
});
