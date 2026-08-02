export const typographyTokens = {
  font: {
    ui: 'var(--font-ui)',
    editorial: 'var(--font-editorial)',
  },
  size: {
    displayXl: 'var(--seraya-type-display-xl)',
    displayLg: 'var(--seraya-type-display-lg)',
    displayMd: 'var(--seraya-type-display-md)',
    displaySm: 'var(--seraya-type-display-sm)',
    pageTitle: 'var(--seraya-type-page-title)',
    operationalTitle: 'var(--seraya-type-operational-title)',
    sectionTitle: 'var(--seraya-type-section-title)',
    subsectionTitle: 'var(--seraya-type-subsection-title)',
    metricValue: 'var(--seraya-type-metric-value)',
    bodyLg: 'var(--seraya-type-body-lg)',
    bodyMd: 'var(--seraya-type-body)',
    bodySm: 'var(--seraya-type-body-compact)',
    caption: 'var(--seraya-type-caption)',
    micro: 'var(--seraya-type-micro)',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    display: '1',
    heading: '1.15',
    body: '1.57',
    compact: '1.42',
  },
} as const;

export type TypographyToken = keyof typeof typographyTokens.size;
