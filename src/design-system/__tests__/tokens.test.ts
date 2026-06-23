import { describe, expect, it } from 'vitest';

import {
  badgeVariants,
  buttonSizes,
  buttonVariants,
  semanticColorTokens,
  serayaPalette,
  typographyTokens,
} from '@/design-system';

describe('Seraya design system contracts', () => {
  it('keeps the required brand palette available', () => {
    expect(serayaPalette.rosewood).toBe('#8E4B52');
    expect(serayaPalette.ivory).toBe('#FCF8F3');
    expect(serayaPalette.ink).toBe('#2B2523');
  });

  it('exposes semantic roles rather than only raw colors', () => {
    expect(semanticColorTokens.actionPrimary).toBe('var(--seraya-action-primary)');
    expect(semanticColorTokens.textPrimary).toBe('var(--seraya-text-primary)');
    expect(semanticColorTokens.surface).toBe('var(--seraya-bg-surface)');
  });

  it('provides the baseline primitive variants', () => {
    expect(buttonVariants).toHaveProperty('primary');
    expect(buttonVariants).toHaveProperty('secondary');
    expect(buttonSizes).toHaveProperty('md');
    expect(badgeVariants).toHaveProperty('success');
  });

  it('keeps editorial and ui typography roles available', () => {
    expect(typographyTokens.font.editorial).toBe('var(--font-editorial)');
    expect(typographyTokens.font.ui).toBe('var(--font-ui)');
  });
});
