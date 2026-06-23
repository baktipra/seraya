export const typographyTokens = {
  font: {
    ui: 'var(--font-ui)',
    editorial: 'var(--font-editorial)',
  },
  size: {
    displayXl: 'clamp(3rem, 7vw, 5.5rem)',
    displayLg: 'clamp(2.5rem, 5vw, 4.25rem)',
    displayMd: 'clamp(2rem, 3vw, 3rem)',
    headingXl: '2.25rem',
    headingLg: '1.75rem',
    headingMd: '1.375rem',
    headingSm: '1.125rem',
    bodyLg: '1.125rem',
    bodyMd: '1rem',
    bodySm: '0.875rem',
    caption: '0.75rem',
  },
  lineHeight: {
    display: '0.98',
    heading: '1.15',
    body: '1.6',
    compact: '1.35',
  },
} as const;

export type TypographyToken = keyof typeof typographyTokens.size;
