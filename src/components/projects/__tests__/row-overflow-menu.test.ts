import { describe, expect, it } from 'vitest';

import { getOverflowMenuPosition } from '@/components/projects/row-overflow-menu';

describe('getOverflowMenuPosition', () => {
  it('opens upward when space below is insufficient', () => {
    expect(
      getOverflowMenuPosition(
        { bottom: 760, left: 560, right: 600, top: 724 },
        { height: 800, width: 1024 },
        { height: 180, width: 208 },
      ).placement,
    ).toBe('top');
  });
  it('clamps menus inside the horizontal viewport', () => {
    const position = getOverflowMenuPosition(
      { bottom: 120, left: 980, right: 1012, top: 84 },
      { height: 800, width: 1024 },
      { height: 160, width: 208 },
    );
    expect(position.left).toBeGreaterThanOrEqual(12);
    expect(position.left).toBeLessThanOrEqual(804);
  });
});
