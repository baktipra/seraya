/** Raw palette references. Components should consume semantic CSS roles instead. */
export const serayaPalette = {
  ink: '#211F1D',
  ivory: '#F7F6F3',
  paper: '#FFFFFF',
  rosewood: '#7B414C',
  rosewoodSoft: '#F5E9EB',
  terracotta: '#A95F4D',
  sage: '#788A7D',
  sand: '#EEE9E3',
  muted: '#8A847E',
  border: '#E2DDD7',
  success: '#2E6B57',
  warning: '#95601E',
  error: '#A84242',
  info: '#42687B',
} as const;

/** Semantic color names backed by `src/app/design-tokens.css`. */
export const semanticColorTokens = {
  canvas: 'var(--seraya-bg-canvas)',
  surface: 'var(--seraya-bg-surface)',
  surfaceSubtle: 'var(--seraya-bg-surface-subtle)',
  surfaceRaised: 'var(--seraya-bg-surface-raised)',
  surfaceBrandSoft: 'var(--seraya-bg-brand-soft)',
  surfaceBrandSofter: 'var(--seraya-bg-brand-softer)',
  textPrimary: 'var(--seraya-text-primary)',
  textSecondary: 'var(--seraya-text-secondary)',
  textMuted: 'var(--seraya-text-muted)',
  textDisabled: 'var(--seraya-text-disabled)',
  textInverse: 'var(--seraya-text-inverse)',
  actionPrimary: 'var(--seraya-action-primary)',
  actionPrimaryHover: 'var(--seraya-action-primary-hover)',
  actionPrimaryPressed: 'var(--seraya-action-primary-pressed)',
  actionSecondary: 'var(--seraya-action-secondary)',
  borderSubtle: 'var(--seraya-border-subtle)',
  borderDefault: 'var(--seraya-border-default)',
  borderStrong: 'var(--seraya-border-strong)',
  focusRing: 'var(--seraya-focus-ring)',
  overlay: 'var(--seraya-overlay)',
  success: 'var(--seraya-status-success)',
  warning: 'var(--seraya-status-warning)',
  error: 'var(--seraya-status-error)',
  info: 'var(--seraya-status-info)',
} as const;

export type SerayaPaletteToken = keyof typeof serayaPalette;
export type SerayaSemanticColorToken = keyof typeof semanticColorTokens;
