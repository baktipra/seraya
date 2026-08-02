export const spacingTokens = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
} as const;

export const radiusTokens = {
  sm: 'var(--seraya-radius-sm)',
  md: 'var(--seraya-radius-md)',
  lg: 'var(--seraya-radius-lg)',
  xl: 'var(--seraya-radius-xl)',
  dialog: 'var(--seraya-radius-dialog)',
  pill: 'var(--seraya-radius-pill)',
} as const;

export const shadowTokens = {
  level1: 'var(--seraya-shadow-level-1)',
  level2: 'var(--seraya-shadow-level-2)',
  level3: 'var(--seraya-shadow-level-3)',
  soft: 'var(--seraya-shadow-soft)',
  float: 'var(--seraya-shadow-float)',
  modal: 'var(--seraya-shadow-modal)',
} as const;

export const controlTokens = {
  compact: 'var(--seraya-control-height-compact)',
  default: 'var(--seraya-control-height)',
  large: 'var(--seraya-control-height-large)',
} as const;
