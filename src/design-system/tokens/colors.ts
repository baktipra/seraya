/**
 * Raw palette references for Seraya. Components should prefer semantic CSS tokens
 * (for example `--seraya-action-primary`) rather than consuming these values directly.
 */
export const serayaPalette = {
  ink: '#2B2523',
  ivory: '#FCF8F3',
  paper: '#FFFFFF',
  rosewood: '#8E4B52',
  rosewoodSoft: '#F3E4E5',
  terracotta: '#B96B56',
  sage: '#849386',
  sand: '#F1E7DC',
  muted: '#776C65',
  border: '#E8DDD2',
  success: '#2F6D58',
  warning: '#9A6426',
  error: '#A24242',
  info: '#3D657C',
} as const;

/**
 * Semantic color names used by Seraya product components.
 * The values map to CSS custom properties defined in `src/app/globals.css`.
 */
export const semanticColorTokens = {
  canvas: 'var(--seraya-bg-canvas)',
  surface: 'var(--seraya-bg-surface)',
  surfaceSoft: 'var(--seraya-bg-soft)',
  surfaceBrandSoft: 'var(--seraya-bg-brand-soft)',
  textPrimary: 'var(--seraya-text-primary)',
  textSecondary: 'var(--seraya-text-secondary)',
  textMuted: 'var(--seraya-text-muted)',
  textInverse: 'var(--seraya-text-inverse)',
  actionPrimary: 'var(--seraya-action-primary)',
  actionPrimaryHover: 'var(--seraya-action-primary-hover)',
  actionSecondary: 'var(--seraya-action-secondary)',
  borderDefault: 'var(--seraya-border-default)',
  borderStrong: 'var(--seraya-border-strong)',
  focusRing: 'var(--seraya-focus-ring)',
  success: 'var(--seraya-status-success)',
  warning: 'var(--seraya-status-warning)',
  error: 'var(--seraya-status-error)',
  info: 'var(--seraya-status-info)',
} as const;

export type SerayaPaletteToken = keyof typeof serayaPalette;
export type SerayaSemanticColorToken = keyof typeof semanticColorTokens;
