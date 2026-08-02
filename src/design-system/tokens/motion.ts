export const motionTokens = {
  duration: {
    fast: 'var(--seraya-motion-fast)',
    default: 'var(--seraya-motion-default)',
    panel: 'var(--seraya-motion-panel)',
    large: 'var(--seraya-motion-large)',
  },
  easing: {
    standard: 'var(--seraya-ease-standard)',
    exit: 'var(--seraya-ease-exit)',
  },
} as const;

export const iconTokens = {
  control: '1rem',
  default: '1.125rem',
  navigation: '1.25rem',
} as const;
